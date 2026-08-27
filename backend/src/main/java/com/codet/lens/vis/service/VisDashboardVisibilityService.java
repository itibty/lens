package com.codet.lens.vis.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.codet.lens.common.FieldConst;
import com.codet.lens.vis.entity.VisDashGroup;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisDashGroupMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VisDashboardVisibilityService {

    private final VisDashGroupMapper groupMapper;
    private final VisDashboardMapper dashboardMapper;

    public Set<Long> filterVisibleDashboardIds(Set<Long> dashboardIds) {
        if (dashboardIds == null || dashboardIds.isEmpty())
            return Set.of();
        Set<Long> effectiveGroups = effectiveGroupIds(groupMapper.selectList(
                new QueryWrapper<VisDashGroup>()
                        .ne("status", FieldConst.DEL)
                        .select("id", "pid", "status")));
        Set<Long> visible = new HashSet<>();
        for (VisDashboard dashboard : dashboardMapper.selectList(new QueryWrapper<VisDashboard>()
                .in("id", dashboardIds)
                .eq("status", FieldConst.EBL)
                .select("id", "group_id"))) {
            long groupId = dashboard.getGroupId() == null ? 0L : dashboard.getGroupId();
            if (groupId == 0 || effectiveGroups.contains(groupId))
                visible.add(dashboard.getId());
        }
        return visible;
    }

    static Set<Long> effectiveGroupIds(List<VisDashGroup> groups) {
        Map<Long, VisDashGroup> groupMap = new HashMap<>();
        for (VisDashGroup group : groups) {
            if (group.getId() != null)
                groupMap.put(group.getId(), group);
        }
        Map<Long, Boolean> memo = new HashMap<>();
        Set<Long> effective = new HashSet<>();
        for (Long groupId : groupMap.keySet()) {
            if (isEffective(groupId, groupMap, memo, new HashSet<>()))
                effective.add(groupId);
        }
        return effective;
    }

    private static boolean isEffective(Long groupId, Map<Long, VisDashGroup> groups,
                                       Map<Long, Boolean> memo, Set<Long> visiting) {
        Boolean cached = memo.get(groupId);
        if (cached != null)
            return cached;
        VisDashGroup group = groups.get(groupId);
        if (group == null || !FieldConst.EBL.equals(group.getStatus()) || !visiting.add(groupId)) {
            memo.put(groupId, false);
            return false;
        }
        Long pid = group.getPid();
        boolean effective = pid == null || pid == 0 || isEffective(pid, groups, memo, visiting);
        visiting.remove(groupId);
        memo.put(groupId, effective);
        return effective;
    }
}
