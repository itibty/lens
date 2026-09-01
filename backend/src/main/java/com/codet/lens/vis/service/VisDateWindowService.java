package com.codet.lens.vis.service;

import com.codet.lens.vis.core.query.ContrastWindowResolver;
import com.codet.lens.vis.core.query.VisQueryPrep;
import com.codet.lens.vis.dto.query.ContrastRange;
import com.codet.lens.vis.dto.query.DateWindowRequest;
import com.codet.lens.vis.dto.query.DateWindowResponse;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

/** 配置态日期快捷 / 对比窗预览。 */
@Service
public class VisDateWindowService {

    public DateWindowResponse preview(DateWindowRequest request) {
        LocalDate asOfDate = VisQueryPrep.parseAsOfDate(request.getAsOfDate());
        ContrastWindowResolver.Window window = ContrastWindowResolver.preview(
                request.getValueExp(), request.getValue(), request.getCalcMethod(), asOfDate);
        DateWindowResponse response = new DateWindowResponse();
        response.setAsOfDate(window.getAsOfDate().toString());
        ContrastRange current = new ContrastRange();
        current.setValueExp(request.getValueExp());
        current.setStart(window.getCurrent()[0]);
        current.setEnd(window.getCurrent()[1]);
        response.setCurrent(current);
        if (window.getCompare() != null) {
            ContrastRange compare = new ContrastRange();
            compare.setStart(window.getCompare()[0]);
            compare.setEnd(window.getCompare()[1]);
            response.setCompare(compare);
        }
        return response;
    }
}
