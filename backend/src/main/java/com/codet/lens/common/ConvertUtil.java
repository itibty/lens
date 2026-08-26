package com.codet.lens.common;

import com.baomidou.mybatisplus.core.metadata.IPage;

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
