package com.codet.lens.vis.dto.group;

import com.codet.lens.common.EnumValue;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.TreeNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

public class VisGroupDtos {

    @Getter
    @Setter
    public static class DashGroupInfo extends TreeNode<DashGroupInfo> {
        private String groupName;
        private String icon;
        private Integer sortNum;
        private String status;
        private Integer dashCount;
        /** 子孙节点看板数合计（不含本节点） */
        private Integer descDashCount;
    }

    @Getter
    @Setter
    public static class SaveDashGroupRequest {
        private Long id;
        private Long pid;
        @NotBlank
        @Size(max = 50)
        private String groupName;
        @Size(max = 50)
        private String icon;
        private Integer sortNum;
        @EnumValue(strValues = {FieldConst.EBL, FieldConst.DBL})
        private String status;
    }

    @Getter
    @Setter
    public static class AssignNode extends TreeNode<AssignNode> {
        private String name;
        private String icon;
        /** GROUP | DASH */
        private String nodeType;
    }

    @Getter
    @Setter
    public static class ReportNode extends TreeNode<ReportNode> {
        private String name;
        private String icon;
        /** 看板节点为 /vis/report/{id}；分组为空 */
        private String url;
        /** GROUP | DASH */
        private String nodeType;
    }

    @Getter
    @Setter
    public static class ManageNode extends TreeNode<ManageNode> {
        /** GROUP | DASH */
        private String nodeType;
        private String name;
        private String icon;
        private String status;
        private Integer sortNum;
        /** 分组节点为自身 id；看板节点为所属分组 id */
        private Long groupId;
        private Boolean virtual;
    }
}
