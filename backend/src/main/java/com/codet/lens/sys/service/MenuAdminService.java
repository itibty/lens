package com.codet.lens.sys.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.ResultException;
import com.codet.lens.sys.dto.SysDtos.MenuTree;
import com.codet.lens.sys.dto.SysDtos.SaveMenuRequest;
import com.codet.lens.sys.entity.SysMenu;
import com.codet.lens.sys.mapper.SysMenuMapper;
import com.codet.lens.sys.mapper.SysRoleMenuMapper;
import com.codet.lens.sys.entity.SysRoleMenu;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class MenuAdminService {

    private final SysMenuMapper menuMapper;
    private final SysRoleMenuMapper roleMenuMapper;
    private final PermissionTokenService permissionTokenService;

    public List<MenuTree> tree() {
        List<SysMenu> rows = menuMapper.selectList(Wrappers.<SysMenu>lambdaQuery()
                .ne(SysMenu::getStatus, FieldConst.DEL)
                .orderByAsc(SysMenu::getSortNum));
        Map<Long, MenuTree> map = new HashMap<>();
        for (SysMenu row : rows) {
            MenuTree node = new MenuTree();
            node.setId(row.getId());
            node.setPid(row.getPid());
            node.setMenuName(row.getMenuName());
            node.setMenuType(row.getMenuType());
            node.setRoutePath(row.getRoutePath());
            node.setIcon(row.getIcon());
            node.setSortNum(row.getSortNum());
            node.setPermCode(row.getPermCode());
            node.setStatus(row.getStatus());
            node.setChildren(new ArrayList<>());
            map.put(row.getId(), node);
        }
        List<MenuTree> roots = new ArrayList<>();
        for (MenuTree node : map.values()) {
            MenuTree parent = node.getPid() == null || node.getPid() == 0 ? null : map.get(node.getPid());
            if (parent == null) {
                roots.add(node);
            } else {
                parent.getChildren().add(node);
            }
        }
        roots.sort(Comparator.comparing(MenuTree::getSortNum, Comparator.nullsLast(Integer::compareTo)));
        return roots;
    }

    @Transactional
    public Long save(SaveMenuRequest req) {
        if (!FieldConst.MENU.equals(req.getMenuType()) && !FieldConst.FUNC.equals(req.getMenuType())) {
            throw ResultException.fail("菜单类型无效");
        }
        SysMenu menu = req.getId() == null ? new SysMenu() : require(req.getId());
        String nextPermCode = FieldConst.MENU.equals(req.getMenuType()) ? null : req.getPermCode();
        String nextStatus = StrUtil.isBlank(req.getStatus())
                ? (req.getId() == null ? FieldConst.EBL : menu.getStatus())
                : req.getStatus();
        boolean authChanged = req.getId() != null
                && (!Objects.equals(menu.getMenuType(), req.getMenuType())
                || !Objects.equals(menu.getPermCode(), nextPermCode)
                || !Objects.equals(menu.getStatus(), nextStatus));
        boolean changedToMenu = req.getId() != null
                && FieldConst.FUNC.equals(menu.getMenuType())
                && FieldConst.MENU.equals(req.getMenuType());
        menu.setPid(req.getPid() == null ? 0L : req.getPid());
        menu.setMenuName(req.getMenuName());
        menu.setMenuType(req.getMenuType());
        menu.setRoutePath(req.getRoutePath());
        menu.setIcon(req.getIcon());
        menu.setSortNum(req.getSortNum() == null ? 0 : req.getSortNum());
        menu.setPermCode(nextPermCode);
        menu.setStatus(nextStatus);
        if (req.getId() == null) {
            menu.createCallback();
            menuMapper.insert(menu);
        } else {
            menu.modifyCallback();
            menuMapper.updateById(menu);
            if (authChanged) {
                permissionTokenService.invalidateMenuUsers(menu.getId());
            }
            if (changedToMenu) {
                roleMenuMapper.delete(Wrappers.<SysRoleMenu>lambdaQuery()
                        .eq(SysRoleMenu::getMenuId, menu.getId()));
            }
        }
        return menu.getId();
    }

    @Transactional
    public void delete(Long menuId) {
        long children = menuMapper.selectCount(Wrappers.<SysMenu>lambdaQuery()
                .eq(SysMenu::getPid, menuId)
                .ne(SysMenu::getStatus, FieldConst.DEL));
        if (children > 0) {
            throw ResultException.fail("请先删除子菜单");
        }
        SysMenu menu = require(menuId);
        menu.setStatus(FieldConst.DEL);
        menu.modifyCallback();
        menuMapper.updateById(menu);
        permissionTokenService.invalidateMenuUsers(menuId);
        roleMenuMapper.delete(Wrappers.<SysRoleMenu>lambdaQuery().eq(SysRoleMenu::getMenuId, menuId));
    }

    private SysMenu require(Long id) {
        SysMenu menu = menuMapper.selectById(id);
        if (menu == null || FieldConst.DEL.equals(menu.getStatus())) {
            throw ResultException.fail("菜单不存在");
        }
        return menu;
    }
}
