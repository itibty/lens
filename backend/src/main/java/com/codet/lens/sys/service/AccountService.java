package com.codet.lens.sys.service;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.auth.AuthUser;
import com.codet.lens.common.auth.JwtService;
import com.codet.lens.common.auth.TokenInvalidateService;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.SimpleResponse;
import com.codet.lens.common.base.Status;
import com.codet.lens.common.config.LensProperties;
import com.codet.lens.sys.dto.auth.AccountInfo;
import com.codet.lens.sys.dto.auth.LoginRequest;
import com.codet.lens.sys.dto.auth.LoginResponse;
import com.codet.lens.sys.dto.auth.ModifyPwdRequest;
import com.codet.lens.sys.dto.auth.UserMenu;
import com.codet.lens.sys.entity.SysMenu;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.mapper.SysMenuMapper;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.vis.dto.group.VisGroupDtos.ReportNode;
import com.codet.lens.vis.service.VisDashGroupService;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final SysUserMapper sysUserMapper;
    private final SysMenuMapper sysMenuMapper;
    private final VisDashGroupService visDashGroupService;
    private final JwtService jwtService;
    private final TokenInvalidateService tokenInvalidateService;
    private final LensProperties properties;

    public LoginResponse login(LoginRequest req) {
        SysUser user = sysUserMapper.selectOne(Wrappers.<SysUser>lambdaQuery()
                .eq(SysUser::getUsername, req.getUsername())
                .eq(SysUser::getStatus, Status.EBL));
        if (user == null || !BCrypt.checkpw(req.getPassword(), user.getPassword())) {
            throw ResultException.fail("登录失败");
        }
        tokenInvalidateService.invalidate(user.getId());
        long now = System.currentTimeMillis();
        // 仅签发当时已生效角色。/auth/me、菜单、看板都认这份 JWT，不再按 now 扩权。
        // 配置变更踢人；start_at 到点不踢，需重新登录。end_at 压缩 token 过期。
        Set<String> roles = new HashSet<>(sysUserMapper.findRoleCodes(user.getId(), now));
        Set<String> perms = new HashSet<>(sysUserMapper.findPermCodes(user.getId(), now));
        Long earliestRoleEndAt = sysUserMapper.findEarliestRoleEndAt(user.getId(), now);
        long expiresAt = resolveTokenExpiresAt(now, properties.getJwtTtlMs(), earliestRoleEndAt);
        String token = jwtService.createToken(user.getId().toString(), roles, perms, expiresAt);
        sysUserMapper.updateLastLoginAt(user.getId(), System.currentTimeMillis());
        LoginResponse resp = new LoginResponse();
        resp.setToken("Bearer " + token);
        resp.setTokenExpireAt(expiresAt);
        resp.setUserInfo(toInfo(user, roles, perms));
        return resp;
    }

    public SimpleResponse<AccountInfo> current() {
        Long userId = AuthContext.getUserIdLong();
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) {
            throw ResultException.fail("用户不存在");
        }
        AuthUser auth = AuthContext.get();
        Set<String> roles = auth == null ? Set.of() : new HashSet<>(auth.getRoles());
        Set<String> perms = auth == null ? Set.of() : new HashSet<>(auth.getPerms());
        return new SimpleResponse<>(toInfo(user, roles, perms));
    }

    public ListResponse<UserMenu> menus() {
        List<SysMenu> all = sysMenuMapper.selectList(Wrappers.<SysMenu>lambdaQuery()
                .eq(SysMenu::getStatus, Status.EBL)
                .orderByAsc(SysMenu::getSortNum));
        Set<Long> visibleMenuIds = visibleMenuIds(jwtRoleCodes(), all);
        List<SysMenu> rows = all.stream()
                .filter(m -> "MENU".equals(m.getMenuType()))
                .filter(m -> visibleMenuIds.contains(m.getId()))
                .toList();
        List<UserMenu> roots = toTree(rows);
        roots.add(0, reportCenterRoot());
        return new ListResponse<>(roots);
    }

    public void modifyPassword(ModifyPwdRequest req) {
        SysUser user = sysUserMapper.selectById(AuthContext.getUserIdLong());
        if (user == null || !BCrypt.checkpw(req.getOldPassword(), user.getPassword())) {
            throw ResultException.fail("原密码错误");
        }
        user.setPassword(BCrypt.hashpw(req.getNewPassword()));
        user.modifyCallback();
        sysUserMapper.updateById(user);
        tokenInvalidateService.invalidate(user.getId());
    }

    public void logout() {
        tokenInvalidateService.invalidate(AuthContext.getUserIdLong());
    }

    static long resolveTokenExpiresAt(long now, long jwtTtlMs, Long earliestRoleEndAt) {
        long defaultExpiresAt = now + jwtTtlMs;
        return earliestRoleEndAt == null ? defaultExpiresAt : Math.min(defaultExpiresAt, earliestRoleEndAt);
    }

    private AccountInfo toInfo(SysUser user, Set<String> roles, Set<String> perms) {
        AccountInfo info = new AccountInfo();
        info.setId(user.getId());
        info.setUsername(user.getUsername());
        info.setRealName(user.getRealName());
        info.setStatus(user.getStatus());
        info.setPhone("");
        info.setEmail("");
        info.setRoleCodes(roles);
        info.setFunctionCodes(perms);
        return info;
    }

    private static Set<String> jwtRoleCodes() {
        AuthUser auth = AuthContext.get();
        return auth == null ? Set.of() : auth.getRoles();
    }

    private Set<Long> visibleMenuIds(Set<String> roleCodes, List<SysMenu> all) {
        Map<Long, SysMenu> byId = new HashMap<>();
        for (SysMenu row : all)
            byId.put(row.getId(), row);
        Set<Long> ids = new HashSet<>();
        if (roleCodes == null || roleCodes.isEmpty()) {
            return ids;
        }
        for (SysMenu func : sysMenuMapper.findFuncsByRoleCodes(roleCodes)) {
            Long pid = func.getPid();
            while (pid != null && pid != 0) {
                if (!ids.add(pid))
                    break;
                SysMenu parent = byId.get(pid);
                pid = parent == null ? null : parent.getPid();
            }
        }
        return ids;
    }

    private UserMenu reportCenterRoot() {
        UserMenu root = new UserMenu();
        root.setId(VisDashGroupService.REPORT_ROOT_ID);
        root.setPid(0L);
        root.setName("报表中心");
        root.setIcon("report-line");
        root.setUrl("/vis/report");
        List<ReportNode> nodes = visDashGroupService.reportTree().getList();
        root.setChildren(toReportMenus(nodes, VisDashGroupService.REPORT_ROOT_ID));
        return root;
    }

    private List<UserMenu> toReportMenus(List<ReportNode> nodes, Long fallbackPid) {
        List<UserMenu> menus = new ArrayList<>();
        if (nodes == null || nodes.isEmpty())
            return menus;
        for (ReportNode node : nodes) {
            UserMenu menu = new UserMenu();
            menu.setId(node.getId());
            long pid = node.getPid() == null || node.getPid() == 0 ? fallbackPid : node.getPid();
            menu.setPid(pid);
            menu.setName(node.getName());
            menu.setUrl(node.getUrl());
            menu.setIcon(node.getIcon());
            menu.setChildren(toReportMenus(node.getChildren(), node.getId()));
            menus.add(menu);
        }
        return menus;
    }

    private List<UserMenu> toTree(List<SysMenu> rows) {
        Map<Long, UserMenu> map = new LinkedHashMap<>();
        for (SysMenu row : rows) {
            UserMenu node = new UserMenu();
            node.setId(row.getId());
            node.setPid(row.getPid());
            node.setName(row.getMenuName());
            node.setUrl(row.getRoutePath());
            node.setIcon(row.getIcon());
            node.setChildren(new ArrayList<>());
            map.put(row.getId(), node);
        }
        List<UserMenu> roots = new ArrayList<>();
        for (UserMenu node : map.values()) {
            UserMenu parent = node.getPid() == null || node.getPid() == 0 ? null : map.get(node.getPid());
            if (parent == null) {
                roots.add(node);
            } else {
                parent.getChildren().add(node);
            }
        }
        roots.removeIf(n -> (n.getChildren() == null || n.getChildren().isEmpty()) && StrUtil.isBlank(n.getUrl()));
        return roots;
    }
}
