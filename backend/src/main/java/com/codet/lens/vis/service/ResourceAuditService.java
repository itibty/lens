package com.codet.lens.vis.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.base.BaseEntity;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.vis.dto.ResourceAuditInfo;
import java.util.Collection;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ResourceAuditService {
    private final SysUserMapper users;

    /** 只取本页涉及的姓名、账号，避免逐行查询和依赖系统用户管理权限。 */
    public void fillNames(Collection<? extends ResourceAuditInfo> records) {
        var ids = records.stream()
                .flatMap(row -> Stream.of(row.getCreateBy(), row.getModifyBy()))
                .filter(Objects::nonNull)
                .filter(id -> !BaseEntity.DEFAULT_USER.equals(id))
                .collect(Collectors.toSet());
        Map<Long, String> names = ids.isEmpty() ? Map.of() : users.selectList(Wrappers.<SysUser>lambdaQuery()
                        .select(SysUser::getId, SysUser::getRealName, SysUser::getUsername)
                        .in(SysUser::getId, ids))
                .stream().collect(Collectors.toMap(SysUser::getId,
                        user -> StrUtil.blankToDefault(user.getRealName(),
                                StrUtil.blankToDefault(user.getUsername(), "用户（" + user.getId() + "）"))));
        for (ResourceAuditInfo row : records) {
            row.setCreateByName(displayName(row.getCreateBy(), names));
            row.setModifyByName(displayName(row.getModifyBy(), names));
        }
    }

    private static String displayName(Long id, Map<Long, String> names) {
        if (id == null)
            return null;
        if (BaseEntity.DEFAULT_USER.equals(id))
            return "系统";
        return names.getOrDefault(id, "用户（" + id + "）");
    }
}
