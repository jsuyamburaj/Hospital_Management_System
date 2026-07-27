package com.hms.service;

import com.hms.entity.Notification;
import com.hms.entity.Role;
import com.hms.repository.NotificationRepository;
import com.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public List<Notification> getForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void notifyUser(Long userId, String type, String message, Long relatedId) {
        notificationRepository.save(Notification.builder()
                .userId(userId)
                .type(type)
                .message(message)
                .relatedId(relatedId)
                .build());
    }

    // Fans a notification out to every account with the given role - used
    // for "all billing staff" and "all admins" alerts since those roles
    // aren't tied to a single user.
    public void notifyRole(Role role, String type, String message, Long relatedId) {
        userRepository.findByRole(role).forEach(u ->
                notifyUser(u.getId(), type, message, relatedId));
    }

    public void markRead(Long id, Long requestingUserId) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Notification not found"));
        if (!n.getUserId().equals(requestingUserId)) {
            throw new IllegalArgumentException("This notification does not belong to you");
        }
        n.setRead(true);
        notificationRepository.save(n);
    }
}
