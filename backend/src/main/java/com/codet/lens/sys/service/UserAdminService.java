package com.codet.lens.sys.service;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.digest.BCrypt;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.ConvertUtil;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.PageResponse;
import com.codet.lens.common.ResultException;
import com.codet.lens.sys.dto.SysDtos.QueryUserRequest;
import com.codet.lens.sys.dto.SysDtos.ResetPwdRequest;
import com.codet.lens.sys.dto.SysDtos.ResetRolesRequest;
import com.codet.lens.sys.dto.SysDtos.SaveUserRequest;
import com.codet.lens.sys.dto.SysDtos.UserInfo;
import com.codet.lens.sys.dto.SysDtos.UserRoleInfo;
import com.codet.lens.sys.entity.SysRole;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.entity.SysUserRole;
import com.codet.lens.sys.mapper.SysRoleMapper;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.sys.mapper.SysUserRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final SysUserMapper userMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final SysRoleMapper roleMapper;

    public PageResponse<UserInfo> query(QueryUserRequest req) {
        IPage<SysUser> page = userMapper.selectPage(req.getPage().toIPage(), Wrappers.<SysUser>lambdaQuery()
                .like(StrUtil.isNotBlank(req.getUsername()), SysUser::getUsername, req.getUsername())
                .like(StrUtil.isNotBlank(req.getRealName()), SysUser::getRealName, req.getRealName())
                .eq(StrUtil.isNotBlank(req.getStatus()), SysUser::getStatus, req.getStatus())
                .orderByDesc(SysUser::getId));
        List<Long> userIds = page.getRecords().stream().map(SysUser::getId).toList();
        Map<Long, List<SysUserRole>> roleMap = userIds.isEmpty() ? Map.of()
                : userRoleMapper.selectList(Wrappers.<SysUserRole>lambdaQuery().in(SysUserRole::getUserId, userIds))
                .stream().collect(Collectors.groupingBy(SysUserRole::getUserId));
        Map<Long, String> roleNames = roleMapper.selectList(null).stream()
                .collect(Collectors.toMap(SysRole::getId, SysRole::getRoleName, (a, b) -> a));
        IPage<UserInfo> converted = page.convert(row -> {
            UserInfo info = new UserInfo();
            info.setId(row.getId());
            info.setUsername(row.getUsername());
            info.setRealName(row.getRealName());
            info.setAvatar(row.getAvatar());
            info.setStatus(row.getStatus());
            info.setLastLoginAt(row.getLastLoginAt());
            List<SysUserRole> links = roleMap.getOrDefault(row.getId(), List.of());
            info.setRoleIds(links.stream().map(SysUserRole::getRoleId).toList());
            info.setRoleInfos(links.stream().map(link -> {
                UserRoleInfo roleInfo = new UserRoleInfo();
                roleInfo.setRoleId(link.getRoleId());
                roleInfo.setRoleName(roleNames.get(link.getRoleId()));
                roleInfo.setStartAt(link.getStartAt());
                roleInfo.setEndAt(link.getEndAt());
                return roleInfo;
            }).toList());
            info.setRoleNames(links.stream().map(l -> roleNames.get(l.getRoleId())).filter(Objects::nonNull)
                    .collect(Collectors.joining(",")));
            return info;
        });
        return ConvertUtil.toPageResponse(converted);
    }

    @Transactional
    public Long save(SaveUserRequest req) {
        SysUser user = req.getId() == null ? new SysUser() : require(req.getId());
        user.setUsername(req.getUsername());
        user.setRealName(req.getRealName());
        user.setAvatar(req.getAvatar());
        user.setStatus(StrUtil.blankToDefault(req.getStatus(), FieldConst.EBL));
        if (req.getId() == null) {
            if (StrUtil.isBlank(req.getPassword())) {
                throw ResultException.fail("密码不能为空");
            }
            user.setPassword(BCrypt.hashpw(req.getPassword()));
            user.createCallback();
            userMapper.insert(user);
        } else {
            if (StrUtil.isNotBlank(req.getPassword())) {
                user.setPassword(BCrypt.hashpw(req.getPassword()));
            }
            user.modifyCallback();
            userMapper.updateById(user);
        }
        if (req.getRoleIds() != null) {
            resetRoles(user.getId(), req.getRoleIds());
        }
        return user.getId();
    }

    @Transactional
    public void resetRoles(ResetRolesRequest req) {
        resetRoleInfos(req.getUserId(), req.getRoleInfos() == null ? Collections.emptyList() : req.getRoleInfos());
    }

    public void resetPwd(ResetPwdRequest req) {
        SysUser user = require(req.getUserId());
        user.setPassword(BCrypt.hashpw(req.getPassword()));
        user.modifyCallback();
        userMapper.updateById(user);
    }

    public void toggle(Long userId) {
        SysUser user = require(userId);
        user.setStatus(FieldConst.EBL.equals(user.getStatus()) ? FieldConst.DBL : FieldConst.EBL);
        user.modifyCallback();
        userMapper.updateById(user);
    }

    private void resetRoles(Long userId, List<Long> roleIds) {
        resetRoleInfos(userId, roleIds.stream().map(roleId -> {
            UserRoleInfo info = new UserRoleInfo();
            info.setRoleId(roleId);
            return info;
        }).toList());
    }

    private void resetRoleInfos(Long userId, List<UserRoleInfo> roleInfos) {
        userRoleMapper.delete(Wrappers.<SysUserRole>lambdaQuery().eq(SysUserRole::getUserId, userId));
        long now = System.currentTimeMillis();
        for (UserRoleInfo roleInfo : roleInfos) {
            if (roleInfo == null || roleInfo.getRoleId() == null)
                continue;
            SysUserRole link = new SysUserRole();
            link.setUserId(userId);
            link.setRoleId(roleInfo.getRoleId());
            link.setStartAt(roleInfo.getStartAt());
            link.setEndAt(roleInfo.getEndAt());
            link.setCreateAt(now);
            userRoleMapper.insert(link);
        }
    }

    private SysUser require(Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) {
            throw ResultException.fail("用户不存在");
        }
        return user;
    }
}
