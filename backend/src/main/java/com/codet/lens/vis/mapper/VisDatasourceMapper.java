package com.codet.lens.vis.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.codet.lens.vis.entity.VisDatasource;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Param;

public interface VisDatasourceMapper extends BaseMapper<VisDatasource> {
    @Select("SELECT * FROM vis_datasource WHERE id = #{id} FOR UPDATE")
    VisDatasource selectForUpdate(@Param("id") Long id);
}
