// JwtService.java
package ru.psu.amyum.park.security.Jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import ru.psu.amyum.park.dto.JwtAuthenticationDto;

import javax.crypto.SecretKey;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

@Component
public class JwtService {

    private static final Logger LOGGER = LogManager.getLogger(JwtService.class);

    private static final int ACCESS_TOKEN_EXPIRATION_MINUTES = 2;
    private static final int REFRESH_TOKEN_EXPIRATION_DAYS = 1;

    @Value("${jwt.secret}")
    private String jwtSecret;

    public JwtAuthenticationDto generateAuthToken(String email) {
        return createJwtAuthenticationDto(email);
    }

    public JwtAuthenticationDto refreshBaseToken(String email, String refreshToken) {
        if (!validateJwtToken(refreshToken)) {
            LOGGER.error("Недействительный refresh-токен");
            throw new IllegalArgumentException("Недействительный refresh-токен");
        }
        return createJwtAuthenticationDto(email);
    }

    public String getEmailFromToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            return claims.getSubject();
        } catch (JwtException e) {
            LOGGER.error("Ошибка при извлечении email из токена: ", e);
            throw new IllegalArgumentException("Невалидный токен");
        }
    }

    public boolean validateJwtToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (ExpiredJwtException e) {
            LOGGER.warn("Токен истёк: ", e);
        } catch (JwtException e) {
            LOGGER.error("Ошибка в токене: ", e);
        }
        return false;
    }

    private JwtAuthenticationDto createJwtAuthenticationDto(String email) {
        String refreshToken = generateRefreshToken(email);
        JwtAuthenticationDto jwtDto = new JwtAuthenticationDto();
        jwtDto.setToken(generateJwtToken(email));
        jwtDto.setRefreshToken(refreshToken);
        return jwtDto;
    }

    private String generateJwtToken(String email) {
        Date expirationDate = Date.from(LocalDateTime.now()
                .plusMinutes(ACCESS_TOKEN_EXPIRATION_MINUTES)
                .atZone(ZoneId.systemDefault())
                .toInstant());
        return Jwts.builder()
                .setSubject(email)
                .setExpiration(expirationDate)
                .signWith(getSigningKey())
                .compact();
    }

    private String generateRefreshToken(String email) {
        Date expirationDate = Date.from(LocalDateTime.now()
                .plusDays(REFRESH_TOKEN_EXPIRATION_DAYS)
                .atZone(ZoneId.systemDefault())
                .toInstant());
        return Jwts.builder()
                .setSubject(email)
                .setExpiration(expirationDate)
                .signWith(getSigningKey())
                .compact();
    }

    private SecretKey getSigningKey() {
        if (jwtSecret == null || jwtSecret.length() < 32) {
            LOGGER.error("JWT секретный ключ некорректен: длина менее 256 бит (32 символа)");
            throw new IllegalArgumentException("JWT секретный ключ должен быть длиной не менее 256 бит (32 символа).");
        }
        byte[] encodedKey = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(encodedKey);
    }
}