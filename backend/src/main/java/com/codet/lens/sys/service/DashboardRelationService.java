package com.codet.lens.sys.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.PageResponse;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.common.util.ConvertUtil;
import com.codet.lens.sys.dto.role.DashboardRelations.*;
import com.codet.lens.sys.entity.SysRole;
import com.codet.lens.sys.entity.SysRoleDashboard;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.entity.SysUserRole;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.sys.mapper.SysRoleMapper;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.sys.mapper.SysUserRoleMapper;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardRelationService {
    private final VisDashboardMapper dashboardMapper;
    private final SysRoleDashboardMapper roleDashboardMapper;
    private final SysRoleMapper roleMapper;
    private final SysUserMapper userMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final PermissionTokenService permissionTokenService;

    public ListResponse<RoleInfo> listRoles(Long dashboardId) {
        requireDashboard(dashboardId);
        return new ListResponse<>(findRoles(dashboardId).values().stream().map(role -> {
            RoleInfo info = new RoleInfo();
            fillRole(info, role);
            return info;
        }).toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<UserInfo> queryUsers(QueryUsers request) {
        requireDashboard(request.getDashboardId());
        if (request.getPage() == null || request.getPage().pageNumber == null
                || request.getPage().pageNumber < 1 || request.getPage().pageSize == null
                || request.getPage().pageSize < 1 || request.getPage().pageSize > 100) {
            throw ResultException.fail("分页参数不正确");
        }
        String keyword = StrUtil.trim(request.getKeyword());
        IPage<SysUser> page = userMapper.selectPage(request.getPage().toIPage(), Wrappers.<SysUser>query()
                .select("id", "username", "real_name", "status")
                .ne("status", Status.DEL)
                .and(StrUtil.isNotBlank(keyword), query -> query.like("username", keyword).or().like("real_name", keyword))
                .exists("""
                        SELECT 1 FROM sys_user_role ur
                        JOIN sys_role r ON r.id = ur.role_id AND r.status <> 'DEL'
                        JOIN sys_role_dashboard rd ON rd.role_id = r.id
                        WHERE ur.user_id = sys_user.id AND rd.dashboard_id = {0}
                        """, request.getDashboardId())
                .orderByAsc("username", "id"));
        Map<Long, List<UserRoleInfo>> sources = new LinkedHashMap<>();
        if (!page.getRecords().isEmpty()) {
            Map<Long, SysRole> roles = findRoles(request.getDashboardId());
            if (!roles.isEmpty()) {
                long now = System.currentTimeMillis();
                for (SysUserRole link : userRoleMapper.selectList(Wrappers.<SysUserRole>query()
                        .in("user_id", page.getRecords().stream().map(SysUser::getId).toList())
                        .in("role_id", roles.keySet()).orderByAsc("role_id"))) {
                    UserRoleInfo info = new UserRoleInfo();
                    SysRole role = roles.get(link.getRoleId());
                    fillRole(info, role);
                    info.setStartAt(link.getStartAt());
                    info.setEndAt(link.getEndAt());
                    info.setValidity(validity(role.getStatus(), link.getStartAt(), link.getEndAt(), now));
                    sources.computeIfAbsent(link.getUserId(), ignored -> new ArrayList<>()).add(info);
                }
            }
        }
        return ConvertUtil.toPageResponse(page.convert(user -> {
            UserInfo info = new UserInfo();
            info.setId(user.getId());
            info.setUsername(user.getUsername());
            info.setRealName(user.getRealName());
            info.setStatus(user.getStatus());
            info.setRoles(sources.getOrDefault(user.getId(), List.of()));
            return info;
        }));
    }

    @Transactional(rollbackFor = Exception.class)
    public void unlinkRole(UnlinkRole request) {
        requireDashboard(request.getDashboardId());
        int removed = roleDashboardMapper.delete(Wrappers.<SysRoleDashboard>query()
                .eq("dashboard_id", request.getDashboardId()).eq("role_id", request.getRoleId()));
        if (removed > 0) {
            permissionTokenService.invalidateRoleUsers(request.getRoleId());
        }
    }

    static String validity(String roleStatus, Long startAt, Long endAt, long now) {
        if (!Status.EBL.equals(roleStatus)) {
            return "DISABLED";
        }
        if (startAt != null && startAt > now) {
            return "PENDING";
        }
        if (endAt != null && endAt < now) {
            return "EXPIRED";
        }
        return "ACTIVE";
    }

    private Map<Long, SysRole> findRoles(Long dashboardId) {
        return roleMapper.selectList(Wrappers.<SysRole>query()
                        .select("id", "role_name", "role_code", "status")
                        .ne("status", Status.DEL)
                        .exists("SELECT 1 FROM sys_role_dashboard rd WHERE rd.role_id = sys_role.id AND rd.dashboard_id = {0}", dashboardId)
                        .orderByAsc("role_name", "id")).stream()
                .collect(Collectors.toMap(SysRole::getId, role -> role, (a, b) -> a, LinkedHashMap::new));
    }

    private static void fillRole(RoleInfo info, SysRole role) {
        info.setId(role.getId());
        info.setRoleName(role.getRoleName());
        info.setRoleCode(role.getRoleCode());
        info.setStatus(role.getStatus());
    }

    private void requireDashboard(Long id) {
        VisDashboard dashboard = dashboardMapper.selectById(id);
        if (dashboard == null || Status.DEL.equals(dashboard.getStatus())) {
            throw ResultException.fail("看板不存在");
        }
    }
}
