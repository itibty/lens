package com.codet.lens.sys.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.ConvertUtil;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.PageResponse;
import com.codet.lens.common.ResultException;
import com.codet.lens.sys.dto.SysDtos.QueryRoleRequest;
import com.codet.lens.sys.dto.SysDtos.ResetRoleDashboardsRequest;
import com.codet.lens.sys.dto.SysDtos.ResetRoleMenusRequest;
import com.codet.lens.sys.dto.SysDtos.RoleInfo;
import com.codet.lens.sys.dto.SysDtos.SaveRoleRequest;
import com.codet.lens.sys.entity.SysMenu;
import com.codet.lens.sys.entity.SysRole;
import com.codet.lens.sys.entity.SysRoleDashboard;
import com.codet.lens.sys.entity.SysRoleMenu;
import com.codet.lens.sys.mapper.SysMenuMapper;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.sys.mapper.SysRoleMapper;
import com.codet.lens.sys.mapper.SysRoleMenuMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RoleAdminService {

    private final SysRoleMapper roleMapper;
    private final SysRoleMenuMapper roleMenuMapper;
    private final SysRoleDashboardMapper roleDashboardMapper;
    private final SysMenuMapper menuMapper;
    private final PermissionTokenService permissionTokenService;

    public PageResponse<RoleInfo> query(QueryRoleRequest req) {
        IPage<SysRole> page = roleMapper.selectPage(req.getPage().toIPage(), Wrappers.<SysRole>lambdaQuery()
                .like(StrUtil.isNotBlank(req.getRoleName()), SysRole::getRoleName, req.getRoleName())
                .like(StrUtil.isNotBlank(req.getRoleCode()), SysRole::getRoleCode, req.getRoleCode())
                .eq(StrUtil.isNotBlank(req.getStatus()), SysRole::getStatus, req.getStatus())
                .orderByDesc(SysRole::getId));
        return ConvertUtil.toPageResponse(page.convert(this::toInfo));
    }

    public RoleInfo detail(Long roleId) {
        return toInfo(require(roleId));
    }

    @Transactional
    public Long save(SaveRoleRequest req) {
        SysRole role = req.getId() == null ? new SysRole() : require(req.getId());
        String nextStatus = StrUtil.isBlank(req.getStatus())
                ? (req.getId() == null ? FieldConst.EBL : role.getStatus())
                : req.getStatus();
        boolean authChanged = req.getId() != null
                && (!nextStatus.equals(role.getStatus()) || !Objects.equals(req.getRoleCode(), role.getRoleCode()));
        role.setRoleName(req.getRoleName());
        role.setRoleCode(req.getRoleCode());
        role.setRoleNote(req.getRoleNote());
        role.setStatus(nextStatus);
        if (req.getId() == null) {
            role.createCallback();
            roleMapper.insert(role);
        } else {
            role.modifyCallback();
            roleMapper.updateById(role);
            if (authChanged) {
                permissionTokenService.invalidateRoleUsers(role.getId());
            }
        }
        return role.getId();
    }

    @Transactional
    public void resetMenus(ResetRoleMenusRequest req) {
        require(req.getRoleId());
        roleMenuMapper.delete(Wrappers.<SysRoleMenu>lambdaQuery().eq(SysRoleMenu::getRoleId, req.getRoleId()));
        if (req.getMenuIds() == null || req.getMenuIds().isEmpty()) {
            permissionTokenService.invalidateRoleUsers(req.getRoleId());
            return;
        }
        Set<Long> funcIds = new HashSet<>(menuMapper.selectList(Wrappers.<SysMenu>lambdaQuery()
                        .eq(SysMenu::getMenuType, FieldConst.FUNC)
                        .ne(SysMenu::getStatus, FieldConst.DEL)
                        .in(SysMenu::getId, req.getMenuIds()))
                .stream().map(SysMenu::getId).toList());
        long now = System.currentTimeMillis();
        for (Long menuId : req.getMenuIds()) {
            if (!funcIds.contains(menuId)) {
                continue;
            }
            SysRoleMenu link = new SysRoleMenu();
            link.setRoleId(req.getRoleId());
            link.setMenuId(menuId);
            link.setCreateAt(now);
            roleMenuMapper.insert(link);
        }
        permissionTokenService.invalidateRoleUsers(req.getRoleId());
    }

    @Transactional
    public void resetDashboards(ResetRoleDashboardsRequest req) {
        require(req.getRoleId());
        roleDashboardMapper.delete(Wrappers.<SysRoleDashboard>lambdaQuery()
                .eq(SysRoleDashboard::getRoleId, req.getRoleId()));
        if (req.getDashboardIds() != null) {
            long now = System.currentTimeMillis();
            for (Long dashboardId : req.getDashboardIds()) {
                if (dashboardId == null) {
                    continue;
                }
                SysRoleDashboard link = new SysRoleDashboard();
                link.setRoleId(req.getRoleId());
                link.setDashboardId(dashboardId);
                link.setCreateAt(now);
                roleDashboardMapper.insert(link);
            }
        }
        permissionTokenService.invalidateRoleUsers(req.getRoleId());
    }

    public void toggle(Long roleId) {
        SysRole role = require(roleId);
        role.setStatus(FieldConst.EBL.equals(role.getStatus()) ? FieldConst.DBL : FieldConst.EBL);
        role.modifyCallback();
        roleMapper.updateById(role);
        permissionTokenService.invalidateRoleUsers(roleId);
    }

    private RoleInfo toInfo(SysRole role) {
        RoleInfo info = new RoleInfo();
        info.setId(role.getId());
        info.setRoleName(role.getRoleName());
        info.setRoleCode(role.getRoleCode());
        info.setRoleNote(role.getRoleNote());
        info.setStatus(role.getStatus());
        List<Long> menuIds = roleMenuMapper.selectList(Wrappers.<SysRoleMenu>lambdaQuery()
                        .eq(SysRoleMenu::getRoleId, role.getId()))
                .stream().map(SysRoleMenu::getMenuId).toList();
        if (!menuIds.isEmpty()) {
            Set<Long> funcIds = new HashSet<>(menuMapper.selectList(Wrappers.<SysMenu>lambdaQuery()
                            .eq(SysMenu::getMenuType, FieldConst.FUNC)
                            .in(SysMenu::getId, menuIds))
                    .stream().map(SysMenu::getId).toList());
            menuIds = menuIds.stream().filter(funcIds::contains).toList();
        }
        info.setMenuIds(menuIds);
        info.setDashboardIds(roleDashboardMapper.selectList(Wrappers.<SysRoleDashboard>lambdaQuery()
                        .eq(SysRoleDashboard::getRoleId, role.getId()))
                .stream().map(SysRoleDashboard::getDashboardId).toList());
        return info;
    }

    private SysRole require(Long id) {
        SysRole role = roleMapper.selectById(id);
        if (role == null) {
            throw ResultException.fail("角色不存在");
        }
        return role;
    }
}
