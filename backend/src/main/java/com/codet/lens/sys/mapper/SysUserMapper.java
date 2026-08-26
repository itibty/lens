package com.codet.lens.sys.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.codet.lens.sys.entity.SysUser;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

public interface SysUserMapper extends BaseMapper<SysUser> {

    @Select("""
            select r.role_code from sys_role r
            join sys_user_role ur on ur.role_id = r.id
            where ur.user_id = #{userId} and r.status = 'EBL'
              and (ur.start_at is null or ur.start_at <= #{now})
              and (ur.end_at is null or ur.end_at >= #{now})
            """)
    List<String> findRoleCodes(@Param("userId") Long userId, @Param("now") Long now);

    @Select("""
            select distinct m.perm_code from sys_menu m
            join sys_role_menu rm on rm.menu_id = m.id
            join sys_user_role ur on ur.role_id = rm.role_id
            join sys_role r on r.id = ur.role_id
            where ur.user_id = #{userId} and r.status = 'EBL'
              and m.status = 'EBL' and m.perm_code is not null and m.perm_code <> ''
              and (ur.start_at is null or ur.start_at <= #{now})
              and (ur.end_at is null or ur.end_at >= #{now})
            """)
    List<String> findPermCodes(@Param("userId") Long userId, @Param("now") Long now);

    @Update("update sys_user set last_login_at = #{at} where id = #{userId}")
    int updateLastLoginAt(@Param("userId") Long userId, @Param("at") Long at);
}
