package com.codet.lens.common.config;

import com.codet.lens.common.auth.AuthInterceptor;
import com.codet.lens.common.logging.TraceContext;
import com.codet.lens.common.logging.TraceIdFilter;
import jakarta.servlet.DispatcherType;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    @Bean
    public FilterRegistrationBean<TraceIdFilter> traceIdFilterRegistration(TraceIdFilter filter) {
        FilterRegistrationBean<TraceIdFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.setDispatcherTypes(DispatcherType.REQUEST, DispatcherType.ASYNC, DispatcherType.ERROR);
        registration.setAsyncSupported(true);
        return registration;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns(
                        "/v3/api-docs",
                        "/v3/api-docs/**",
                        "/swagger-ui.html",
                        "/swagger-ui/**",
                        "/swagger-ui/index.html"
                );
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders(TraceContext.HEADER)
                .allowCredentials(true);
    }
}
