package io.github.radar.logging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.HandlerMapping;

@ExtendWith(OutputCaptureExtension.class)
class HttpRequestLoggingAspectTest {
    private SampleController controller;

    @BeforeEach
    void bindRequestAndWeaveAspect() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/samples/42");
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/samples/{id}");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request, new MockHttpServletResponse()));
        AspectJProxyFactory factory = new AspectJProxyFactory(new SampleController());
        factory.setProxyTargetClass(true);
        factory.addAspect(new HttpRequestLoggingAspect());
        controller = factory.getProxy();
    }

    @AfterEach
    void unbindRequest() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void logs_status_of_returned_response_entity(CapturedOutput output) {
        controller.created();

        assertThat(output).contains("POST /samples/{id} -> 201");
    }

    @Test
    void logs_status_declared_by_response_status_annotation(CapturedOutput output) {
        controller.accepted();

        assertThat(output).contains("POST /samples/{id} -> 202");
    }

    @Test
    void logs_status_already_set_on_response(CapturedOutput output) {
        controller.plain();

        assertThat(output).contains("POST /samples/{id} -> 200");
    }

    @Test
    void logs_exception_class_and_rethrows_it_unchanged(CapturedOutput output) {
        assertThatThrownBy(() -> controller.failing()).isInstanceOf(IllegalStateException.class);

        assertThat(output).contains("POST /samples/{id} -> исключение java.lang.IllegalStateException");
        assertThat(output).doesNotContain("-> 200");
    }

    @RestController
    class SampleController {
        ResponseEntity<String> created() {
            return ResponseEntity.status(HttpStatus.CREATED).body("created");
        }

        @ResponseStatus(HttpStatus.ACCEPTED)
        String accepted() {
            return "accepted";
        }

        String plain() {
            return "plain";
        }

        String failing() {
            throw new IllegalStateException("failure");
        }
    }
}
