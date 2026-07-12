package com.hms.config;

import com.hms.entity.Role;
import com.hms.entity.User;
import com.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates one default ADMIN account on first boot so there's always a way
 * in without touching the database by hand.
 *
 * Login: admin@hms.com / Admin@123
 * CHANGE THIS PASSWORD before deploying anywhere real.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail("admin@hms.com")) {
            User admin = User.builder()
                    .name("System Admin")
                    .email("admin@hms.com")
                    .password(passwordEncoder.encode("Admin@123"))
                    .role(Role.ADMIN)
                    .build();
            userRepository.save(admin);
            System.out.println(">>> Default admin created: admin@hms.com / Admin@123");
        }
    }
}
