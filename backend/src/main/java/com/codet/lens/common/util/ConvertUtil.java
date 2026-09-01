package com.codet.lens.common.util;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.codet.lens.common.base.PageResponse;

public final class ConvertUtil {
    private ConvertUtil() {
    }

    public static <T> PageResponse<T> toPageResponse(IPage<T> page) {
        return new PageResponse<T>()
                .setPageNumber(page.getCurrent())
                .setPageSize(page.getSize())
                .setTotal(page.getTotal())
                .setPages(page.getPages())
                .setRecords(page.getRecords());
    }
}
