package com.codet.lens.vis.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.ListResponse;
import com.codet.lens.common.ResultException;
import com.codet.lens.sys.service.PermissionTokenService;
import com.codet.lens.vis.dto.group.VisGroupDtos.AssignNode;
import com.codet.lens.vis.dto.group.VisGroupDtos.DashGroupInfo;
import com.codet.lens.vis.dto.group.VisGroupDtos.ManageNode;
import com.codet.lens.vis.dto.group.VisGroupDtos.ReportNode;
import com.codet.lens.vis.dto.group.VisGroupDtos.SaveDashGroupRequest;
import com.codet.lens.vis.entity.VisDashGroup;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisDashGroupMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VisDashGroupService {

    private final VisDashGroupMapper groupMapper;
    private final VisDashboardMapper dashboardMapper;
    private final VisDashboardAccess dashboardAccess;
    private final PermissionTokenService permissionTokenService;

    public ListResponse<DashGroupInfo> tree() {
        List<VisDashGroup> rows = groupMapper.selectList(Wrappers.<VisDashGroup>lambdaQuery()
                .ne(VisDashGroup::getStatus, FieldConst.DEL)
                .orderByAsc(VisDashGroup::getSortNum)
                .orderByAsc(VisDashGroup::getId));
        Map<Long, Long> dashCount = new HashMap<>();
        for (VisDashboard dash : dashboardMapper.selectList(Wrappers.<VisDashboard>lambdaQuery()
                .ne(VisDashboard::getStatus, FieldConst.DEL)
                .select(VisDashboard::getId, VisDashboard::getGroupId))) {
            long gid = dash.getGroupId() == null ? 0L : dash.getGroupId();
            dashCount.merge(gid, 1L, Long::sum);
        }
        Map<Long, DashGroupInfo> map = new LinkedHashMap<>();
        for (VisDashGroup row : rows) {
            DashGroupInfo node = new DashGroupInfo();
            node.setId(row.getId());
            node.setPid(row.getPid());
            node.setGroupName(row.getGroupName());
            node.setIcon(row.getIcon());
            node.setSortNum(row.getSortNum());
            node.setStatus(row.getStatus());
            node.setDashCount(dashCount.getOrDefault(row.getId(), 0L).intValue());
            node.setChildren(new ArrayList<>());
            map.put(row.getId(), node);
        }
        List<DashGroupInfo> roots = new ArrayList<>();
        for (DashGroupInfo node : map.values()) {
            DashGroupInfo parent = node.getPid() == null || node.getPid() == 0 ? null : map.get(node.getPid());
            if (parent == null)
                roots.add(node);
            else
                parent.getChildren().add(node);
        }
        for (DashGroupInfo root : roots)
            fillDescDashCount(root);
        return new ListResponse<>(roots);
    }

    /** 本节点 + 子孙分组 id，用于列表按树筛选。 */
    public List<Long> selfAndDescendantIds(Long groupId) {
        List<Long> ids = new ArrayList<>();
        ids.add(groupId);
        collectDescendants(groupId, childrenMap(), ids);
        return ids;
    }

    public ListResponse<AssignNode> assignTree() {
        List<VisDashGroup> groups = groupMapper.selectList(Wrappers.<VisDashGroup>lambdaQuery()
                .ne(VisDashGroup::getStatus, FieldConst.DEL)
                .orderByAsc(VisDashGroup::getSortNum)
                .orderByAsc(VisDashGroup::getId));
        Set<Long> effectiveGroupIds = VisDashboardVisibilityService.effectiveGroupIds(groups);
        List<VisDashboard> dashes = dashboardMapper.selectList(Wrappers.<VisDashboard>lambdaQuery()
                .eq(VisDashboard::getStatus, FieldConst.EBL)
                .orderByAsc(VisDashboard::getId));
        Map<Long, AssignNode> groupNodes = new LinkedHashMap<>();
        for (VisDashGroup group : groups) {
            if (!effectiveGroupIds.contains(group.getId()))
                continue;
            AssignNode node = new AssignNode();
            node.setId(group.getId());
            node.setPid(group.getPid() == null ? 0L : group.getPid());
            node.setName(group.getGroupName());
            node.setIcon(group.getIcon());
            node.setNodeType("GROUP");
            node.setChildren(new ArrayList<>());
            groupNodes.put(group.getId(), node);
        }
        List<AssignNode> roots = new ArrayList<>();
        for (AssignNode node : groupNodes.values()) {
            if (node.getPid() == 0) {
                roots.add(node);
            } else {
                AssignNode parent = groupNodes.get(node.getPid());
                if (parent == null)
                    continue;
                parent.getChildren().add(node);
            }
        }
        for (VisDashboard dash : dashes) {
            AssignNode leaf = new AssignNode();
            leaf.setId(dash.getId());
            leaf.setName(dash.getDashName());
            leaf.setIcon(dash.getIcon());
            leaf.setNodeType("DASH");
            leaf.setChildren(new ArrayList<>());
            long gid = dash.getGroupId() == null ? 0L : dash.getGroupId();
            AssignNode parent = groupNodes.get(gid);
            if (gid == 0) {
                leaf.setPid(0L);
                roots.add(leaf);
            } else if (parent != null) {
                leaf.setPid(parent.getId());
                parent.getChildren().add(leaf);
            }
        }
        List<AssignNode> visible = new ArrayList<>();
        for (AssignNode node : roots) {
            if (pruneEmptyGroups(node))
                visible.add(node);
        }
        visible.sort(Comparator.comparing(AssignNode::getNodeType).reversed()
                .thenComparing(AssignNode::getId, Comparator.nullsLast(Long::compareTo)));
        if (visible.isEmpty())
            return new ListResponse<>(List.of());
        AssignNode root = new AssignNode();
        root.setId(FieldConst.REPORT_ROOT_ID);
        root.setPid(0L);
        root.setName("报表中心");
        root.setIcon("report-line");
        root.setNodeType("GROUP");
        root.setChildren(visible);
        return new ListResponse<>(List.of(root));
    }

    /** 当前用户已分配、启用中的看板树。分组按层级嵌套，无看板的分组不返回。 */
    public ListResponse<ReportNode> reportTree() {
        Set<Long> assigned = dashboardAccess.assignedDashboardIds();
        if (assigned.isEmpty())
            return new ListResponse<>(List.of());

        List<VisDashGroup> groups = groupMapper.selectList(Wrappers.<VisDashGroup>lambdaQuery()
                .ne(VisDashGroup::getStatus, FieldConst.DEL)
                .orderByAsc(VisDashGroup::getSortNum)
                .orderByAsc(VisDashGroup::getId));
        Set<Long> effectiveGroupIds = VisDashboardVisibilityService.effectiveGroupIds(groups);
        List<VisDashboard> dashes = dashboardMapper.selectList(Wrappers.<VisDashboard>lambdaQuery()
                .eq(VisDashboard::getStatus, FieldConst.EBL)
                .in(VisDashboard::getId, assigned)
                .orderByAsc(VisDashboard::getId));

        Map<Long, ReportNode> groupNodes = new LinkedHashMap<>();
        for (VisDashGroup group : groups) {
            if (!effectiveGroupIds.contains(group.getId()))
                continue;
            ReportNode node = new ReportNode();
            node.setId(group.getId());
            node.setPid(group.getPid() == null ? 0L : group.getPid());
            node.setName(group.getGroupName());
            node.setIcon(group.getIcon());
            node.setNodeType("GROUP");
            node.setChildren(new ArrayList<>());
            groupNodes.put(group.getId(), node);
        }
        List<ReportNode> roots = new ArrayList<>();
        for (ReportNode node : groupNodes.values()) {
            if (node.getPid() == 0) {
                roots.add(node);
            } else {
                ReportNode parent = groupNodes.get(node.getPid());
                if (parent == null)
                    continue;
                parent.getChildren().add(node);
            }
        }
        for (VisDashboard dash : dashes) {
            ReportNode leaf = new ReportNode();
            leaf.setId(dash.getId());
            leaf.setName(dash.getDashName());
            leaf.setIcon(dash.getIcon());
            leaf.setUrl("/vis/report/" + dash.getId());
            leaf.setNodeType("DASH");
            leaf.setChildren(new ArrayList<>());
            long gid = dash.getGroupId() == null ? 0L : dash.getGroupId();
            ReportNode parent = groupNodes.get(gid);
            if (gid == 0) {
                leaf.setPid(0L);
                roots.add(leaf);
            } else if (parent != null) {
                leaf.setPid(parent.getId());
                parent.getChildren().add(leaf);
            }
        }
        List<ReportNode> visible = new ArrayList<>();
        for (ReportNode node : roots) {
            if (pruneEmptyReportGroups(node))
                visible.add(node);
        }
        visible.sort(Comparator.comparing(ReportNode::getNodeType).reversed()
                .thenComparing(ReportNode::getId, Comparator.nullsLast(Long::compareTo)));
        return new ListResponse<>(visible);
    }

    public ListResponse<ManageNode> manageTree() {
        List<VisDashGroup> groups = groupMapper.selectList(Wrappers.<VisDashGroup>lambdaQuery()
                .ne(VisDashGroup::getStatus, FieldConst.DEL)
                .orderByAsc(VisDashGroup::getSortNum)
                .orderByAsc(VisDashGroup::getId));
        List<VisDashboard> dashes = dashboardMapper.selectList(Wrappers.<VisDashboard>lambdaQuery()
                .ne(VisDashboard::getStatus, FieldConst.DEL)
                .orderByDesc(VisDashboard::getId));

        Map<Long, ManageNode> groupNodes = new LinkedHashMap<>();
        for (VisDashGroup group : groups) {
            ManageNode node = new ManageNode();
            node.setId(group.getId());
            node.setPid(group.getPid() == null ? 0L : group.getPid());
            node.setNodeType("GROUP");
            node.setName(group.getGroupName());
            node.setIcon(group.getIcon());
            node.setStatus(group.getStatus());
            node.setSortNum(group.getSortNum());
            node.setGroupId(group.getId());
            node.setVirtual(false);
            node.setChildren(new ArrayList<>());
            groupNodes.put(group.getId(), node);
        }

        List<ManageNode> roots = new ArrayList<>();
        for (ManageNode node : groupNodes.values()) {
            ManageNode parent = node.getPid() == 0 ? null : groupNodes.get(node.getPid());
            if (parent == null)
                roots.add(node);
            else
                parent.getChildren().add(node);
        }

        for (VisDashboard dash : dashes) {
            long groupId = dash.getGroupId() == null ? 0L : dash.getGroupId();
            ManageNode parent = groupId == 0 ? null : groupNodes.get(groupId);
            ManageNode leaf = new ManageNode();
            leaf.setId(dash.getId());
            leaf.setPid(parent == null ? 0L : parent.getId());
            leaf.setNodeType("DASH");
            leaf.setName(dash.getDashName());
            leaf.setIcon(dash.getIcon());
            leaf.setStatus(dash.getStatus());
            leaf.setGroupId(parent == null ? 0L : parent.getId());
            leaf.setVirtual(false);
            leaf.setChildren(new ArrayList<>());
            if (parent == null)
                roots.add(leaf);
            else
                parent.getChildren().add(leaf);
        }
        return new ListResponse<>(roots);
    }

    private boolean pruneEmptyReportGroups(ReportNode node) {
        if (!"GROUP".equals(node.getNodeType()))
            return true;
        List<ReportNode> kept = new ArrayList<>();
        for (ReportNode child : node.getChildren() == null ? List.<ReportNode>of() : node.getChildren()) {
            if (pruneEmptyReportGroups(child))
                kept.add(child);
        }
        node.setChildren(kept);
        return !kept.isEmpty();
    }

    /** 没有看板子孙的分组不展示。 */
    private boolean pruneEmptyGroups(AssignNode node) {
        if (!"GROUP".equals(node.getNodeType()))
            return true;
        List<AssignNode> kept = new ArrayList<>();
        for (AssignNode child : node.getChildren() == null ? List.<AssignNode>of() : node.getChildren()) {
            if (pruneEmptyGroups(child))
                kept.add(child);
        }
        node.setChildren(kept);
        return !kept.isEmpty();
    }

    @Transactional
    public Long save(SaveDashGroupRequest req) {
        VisDashGroup group = req.getId() == null ? new VisDashGroup() : require(req.getId());
        Long pid = req.getPid() == null ? 0L : req.getPid();
        if (req.getId() != null)
            assertPidNotCycle(req.getId(), pid);
        if (pid != 0)
            require(pid);
        group.setPid(pid);
        group.setGroupName(req.getGroupName().trim());
        group.setIcon(req.getIcon());
        group.setSortNum(req.getSortNum() == null ? 0 : req.getSortNum());
        group.setStatus(StrUtil.blankToDefault(req.getStatus(), FieldConst.EBL));
        if (req.getId() == null) {
            group.createCallback();
            groupMapper.insert(group);
        } else {
            group.modifyCallback();
            groupMapper.updateById(group);
            invalidateGroupDashboardUsers(group.getId());
        }
        return group.getId();
    }

    @Transactional
    public void delete(Long groupId) {
        require(groupId);
        long children = groupMapper.selectCount(Wrappers.<VisDashGroup>lambdaQuery()
                .eq(VisDashGroup::getPid, groupId)
                .ne(VisDashGroup::getStatus, FieldConst.DEL));
        if (children > 0)
            throw ResultException.fail("请先删除子分组");
        long dashes = dashboardMapper.selectCount(Wrappers.<VisDashboard>lambdaQuery()
                .eq(VisDashboard::getGroupId, groupId)
                .ne(VisDashboard::getStatus, FieldConst.DEL));
        if (dashes > 0)
            throw ResultException.fail("分组下还有看板，不能删除");
        VisDashGroup patch = new VisDashGroup();
        patch.setId(groupId);
        patch.setStatus(FieldConst.DEL);
        patch.modifyCallback();
        groupMapper.updateById(patch);
    }

    @Transactional
    public void toggle(Long groupId) {
        VisDashGroup row = require(groupId);
        VisDashGroup patch = new VisDashGroup();
        patch.setId(groupId);
        patch.setStatus(FieldConst.EBL.equals(row.getStatus()) ? FieldConst.DBL : FieldConst.EBL);
        patch.modifyCallback();
        groupMapper.updateById(patch);
        invalidateGroupDashboardUsers(groupId);
    }

    private void invalidateGroupDashboardUsers(Long groupId) {
        List<Long> dashboardIds = dashboardMapper.selectList(Wrappers.<VisDashboard>query()
                        .in("group_id", selfAndDescendantIds(groupId))
                        .ne("status", FieldConst.DEL)
                        .select("id"))
                .stream()
                .map(VisDashboard::getId)
                .toList();
        permissionTokenService.invalidateDashboardUsers(dashboardIds);
    }

    private void assertPidNotCycle(Long id, Long pid) {
        if (pid == 0)
            return;
        if (id.equals(pid))
            throw ResultException.fail("上级不能是自己");
        List<Long> descendants = new ArrayList<>();
        collectDescendants(id, childrenMap(), descendants);
        if (descendants.contains(pid))
            throw ResultException.fail("不能把分组挂到自己的子孙下");
    }

    private Map<Long, List<Long>> childrenMap() {
        Map<Long, List<Long>> children = new HashMap<>();
        for (VisDashGroup row : groupMapper.selectList(Wrappers.<VisDashGroup>query()
                .ne("status", FieldConst.DEL)
                .select("id", "pid"))) {
            long parentId = row.getPid() == null ? 0L : row.getPid();
            children.computeIfAbsent(parentId, key -> new ArrayList<>()).add(row.getId());
        }
        return children;
    }

    private void collectDescendants(Long id, Map<Long, List<Long>> children, List<Long> out) {
        for (Long child : children.getOrDefault(id, List.of())) {
            out.add(child);
            collectDescendants(child, children, out);
        }
    }

    private int fillDescDashCount(DashGroupInfo node) {
        int desc = 0;
        for (DashGroupInfo child : node.getChildren() == null ? List.<DashGroupInfo>of() : node.getChildren()) {
            int childOwn = child.getDashCount() == null ? 0 : child.getDashCount();
            desc += childOwn + fillDescDashCount(child);
        }
        node.setDescDashCount(desc);
        return desc;
    }

    private VisDashGroup require(Long id) {
        VisDashGroup row = groupMapper.selectById(id);
        if (row == null || FieldConst.DEL.equals(row.getStatus()))
            throw ResultException.fail("分组不存在");
        return row;
    }
}
