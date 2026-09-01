package com.codet.lens.common.base;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.codet.lens.common.auth.AuthContext;
import java.util.Optional;
import lombok.experimental.Accessors;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Accessors(chain = true)
public abstract class BaseEntity {

    public static final Long DEFAULT_USER = 0L;

    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;

    @TableField("create_by")
    private Long createBy;

    @TableField("create_at")
    private Long createAt;

    @TableField("modify_at")
    private Long modifyAt;

    @TableField("modify_by")
    private Long modifyBy;

    public void createCallback() {
        Long userId = Optional.ofNullable(AuthContext.getUserIdLong()).orElse(DEFAULT_USER);
        long now = System.currentTimeMillis();
        this.setCreateAt(now).setCreateBy(userId).setModifyAt(now).setModifyBy(userId);
    }

    public void modifyCallback() {
        Long userId = Optional.ofNullable(AuthContext.getUserIdLong()).orElse(DEFAULT_USER);
        this.setModifyAt(System.currentTimeMillis()).setModifyBy(userId);
    }
}
