package com.codet.lens.vis.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VisDatasetServiceTest {

    @Test
    void boundsDatasetOptionPageSize() {
        assertEquals(50, VisDatasetService.resolveOptionLimit(null));
        assertEquals(50, VisDatasetService.resolveOptionLimit(0));
        assertEquals(20, VisDatasetService.resolveOptionLimit(20));
        assertEquals(100, VisDatasetService.resolveOptionLimit(500));
    }
}
