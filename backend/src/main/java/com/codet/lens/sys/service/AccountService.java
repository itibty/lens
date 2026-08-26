package com.codet.lens.sys.service;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.auth.AuthContext;
import com.codet.lens.auth.JwtService;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.LensProperties;
import com.codet.lens.common.ListResponse;
import com.codet.lens.common.PermCodes;
import com.codet.lens.common.ResultException;
import com.codet.lens.common.SimpleResponse;
import com.codet.lens.sys.dto.AccountDtos.AccountInfo;
import com.codet.lens.sys.dto.AccountDtos.LoginRequest;
import com.codet.lens.sys.dto.AccountDtos.LoginResponse;
import com.codet.lens.sys.dto.AccountDtos.ModifyPwdRequest;
import com.codet.lens.sys.dto.AccountDtos.UserMenu;
import com.codet.lens.sys.entity.SysMenu;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.mapper.SysMenuMapper;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.vis.entity.VisDashGroup;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisDashGroupMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final SysUserMapper sysUserMapper;
    private final SysMenuMapper sysMenuMapper;
    private final SysRoleDashboardMapper roleDashboardMapper;
    private final VisDashGroupMapper dashGroupMapper;
    private final VisDashboardMapper dashboardMapper;
    private final JwtService jwtService;
    private final LensProperties properties;

    public LoginResponse login(LoginRequest req) {
        SysUser user = sysUserMapper.selectOne(Wrappers.<SysUser>lambdaQuery()
                .eq(SysUser::getUsername, req.getUsername())
                .eq(SysUser::getStatus, FieldConst.EBL));
        if (user == null || !BCrypt.checkpw(req.getPassword(), user.getPassword())) {
            throw ResultException.fail("登录失败");
        }
        long now = System.currentTimeMillis();
        Set<String> roles = new HashSet<>(sysUserMapper.findRoleCodes(user.getId(), now));
        Set<String> perms = new HashSet<>(sysUserMapper.findPermCodes(user.getId(), now));
        if (roles.contains(PermCodes.ROLE_ADMIN)) {
            perms.addAll(allPermCodes());
        }
        long expiresAt = System.currentTimeMillis() + properties.getJwtTtlMs();
        String token = jwtService.createToken(user.getId().toString(), roles, perms, expiresAt);
        sysUserMapper.updateLastLoginAt(user.getId(), System.currentTimeMillis());
        LoginResponse resp = new LoginResponse();
        resp.setToken(FieldConst.TOKEN_PREFIX + token);
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
        long now = System.currentTimeMillis();
        Set<String> roles = new HashSet<>(sysUserMapper.findRoleCodes(userId, now));
        Set<String> perms = new HashSet<>(sysUserMapper.findPermCodes(userId, now));
        if (roles.contains(PermCodes.ROLE_ADMIN)) {
            perms.addAll(allPermCodes());
        }
        return new SimpleResponse<>(toInfo(user, roles, perms));
    }

    public ListResponse<UserMenu> menus() {
        Long userId = AuthContext.getUserIdLong();
        long now = System.currentTimeMillis();
        Set<String> roles = new HashSet<>(sysUserMapper.findRoleCodes(userId, now));
        boolean admin = roles.contains(PermCodes.ROLE_ADMIN);
        List<SysMenu> all = sysMenuMapper.selectList(Wrappers.<SysMenu>lambdaQuery()
                .eq(SysMenu::getStatus, FieldConst.EBL)
                .orderByAsc(SysMenu::getSortNum));
        Set<Long> visibleMenuIds = visibleMenuIds(admin, userId, now, all);
        List<SysMenu> rows = all.stream()
                .filter(m -> FieldConst.MENU.equals(m.getMenuType()))
                .filter(m -> visibleMenuIds.contains(m.getId()))
                .toList();
        List<UserMenu> roots = toTree(rows);
        roots.add(0, buildReportCenter(admin, userId, now));
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
    }

    private AccountInfo toInfo(SysUser user, Set<String> roles, Set<String> perms) {
        AccountInfo info = new AccountInfo();
        info.setId(user.getId());
        info.setUsername(user.getUsername());
        info.setRealName(user.getRealName());
        info.setAvatar(user.getAvatar());
        info.setStatus(user.getStatus());
        info.setPhone("");
        info.setEmail("");
        info.setRoleCodes(roles);
        info.setFunctionCodes(perms);
        return info;
    }

    private Set<Long> visibleMenuIds(boolean admin, Long userId, long now, List<SysMenu> all) {
        Map<Long, SysMenu> byId = new HashMap<>();
        for (SysMenu row : all)
            byId.put(row.getId(), row);
        Set<Long> ids = new HashSet<>();
        if (admin) {
            for (SysMenu row : all) {
                if (FieldConst.MENU.equals(row.getMenuType()))
                    ids.add(row.getId());
            }
            return ids;
        }
        for (SysMenu func : sysMenuMapper.findUserFuncs(userId, now)) {
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

    private UserMenu buildReportCenter(boolean admin, Long userId, long now) {
        UserMenu root = new UserMenu();
        root.setId(FieldConst.REPORT_ROOT_ID);
        root.setPid(0L);
        root.setName("报表中心");
        root.setIcon("report-line");
        root.setChildren(new ArrayList<>());
        List<VisDashboard> dashes = admin
                ? dashboardMapper.selectList(Wrappers.<VisDashboard>lambdaQuery()
                .eq(VisDashboard::getStatus, FieldConst.EBL)
                .orderByAsc(VisDashboard::getId))
                : loadAssignedDashboards(userId, now);
        if (dashes.isEmpty())
            return root;
        List<VisDashGroup> groups = dashGroupMapper.selectList(Wrappers.<VisDashGroup>lambdaQuery()
                .eq(VisDashGroup::getStatus, FieldConst.EBL)
                .orderByAsc(VisDashGroup::getSortNum)
                .orderByAsc(VisDashGroup::getId));
        Map<Long, List<VisDashboard>> byGroup = new LinkedHashMap<>();
        for (VisDashboard dash : dashes) {
            long gid = dash.getGroupId() == null ? 0L : dash.getGroupId();
            byGroup.computeIfAbsent(gid, k -> new ArrayList<>()).add(dash);
        }
        for (VisDashGroup group : groups) {
            List<VisDashboard> items = byGroup.remove(group.getId());
            if (items == null || items.isEmpty())
                continue;
            UserMenu node = new UserMenu();
            node.setId(group.getId());
            node.setPid(FieldConst.REPORT_ROOT_ID);
            node.setName(group.getGroupName());
            node.setIcon(group.getIcon());
            node.setChildren(items.stream().map(d -> toDashMenu(d, group.getId())).toList());
            root.getChildren().add(node);
        }
        List<VisDashboard> ungrouped = byGroup.values().stream().flatMap(List::stream).toList();
        for (VisDashboard dash : ungrouped)
            root.getChildren().add(toDashMenu(dash, FieldConst.REPORT_ROOT_ID));
        return root;
    }

    private List<VisDashboard> loadAssignedDashboards(Long userId, long now) {
        List<Long> ids = roleDashboardMapper.findUserDashboardIds(userId, now);
        if (ids.isEmpty())
            return List.of();
        return dashboardMapper.selectList(Wrappers.<VisDashboard>lambdaQuery()
                .eq(VisDashboard::getStatus, FieldConst.EBL)
                .in(VisDashboard::getId, ids)
                .orderByAsc(VisDashboard::getId));
    }

    private UserMenu toDashMenu(VisDashboard dash, Long pid) {
        UserMenu node = new UserMenu();
        node.setId(dash.getId());
        node.setPid(pid);
        node.setName(dash.getDashName());
        node.setUrl("/vis/report/" + dash.getId());
        node.setChildren(new ArrayList<>());
        return node;
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

    private Set<String> allPermCodes() {
        List<SysMenu> menus = sysMenuMapper.selectList(Wrappers.<SysMenu>lambdaQuery()
                .eq(SysMenu::getStatus, FieldConst.EBL)
                .isNotNull(SysMenu::getPermCode));
        Set<String> set = new HashSet<>();
        for (SysMenu menu : menus) {
            if (menu.getPermCode() != null && !menu.getPermCode().isBlank()) {
                set.add(menu.getPermCode());
            }
        }
        return set;
    }
}
