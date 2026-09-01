package com.codet.lens.sys.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.codet.lens.sys.entity.SysMenu;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface SysMenuMapper extends BaseMapper<SysMenu> {

    @Select("""
            select m.* from sys_menu m
            join sys_role_menu rm on rm.menu_id = m.id
            join sys_user_role ur on ur.role_id = rm.role_id
            join sys_role r on r.id = ur.role_id
            where ur.user_id = #{userId} and r.status = 'EBL'             and m.status = 'EBL' and m.menu_type = 'FUNC'
              and (ur.start_at is null or ur.start_at <= #{now})
              and (ur.end_at is null or ur.end_at >= #{now})
            """)
    List<SysMenu> findUserFuncs(@Param("userId") Long userId, @Param("now") Long now);
}
