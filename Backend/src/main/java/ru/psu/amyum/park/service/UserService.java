package ru.psu.amyum.park.service;

import org.springframework.data.crossstore.ChangeSetPersister;
import ru.psu.amyum.park.dto.JwtAuthenticationDto;
import ru.psu.amyum.park.dto.RefreshTokenDto;
import ru.psu.amyum.park.dto.UserCredentialsDto;
import ru.psu.amyum.park.dto.UserDto;

import javax.naming.AuthenticationException;

public interface UserService {
    JwtAuthenticationDto singIn(UserCredentialsDto userCredentialsDto) throws AuthenticationException;
    JwtAuthenticationDto refreshToken(RefreshTokenDto refreshTokenDto) throws Exception;
    UserDto getUserByEmail(String email) throws ChangeSetPersister.NotFoundException;
    void register(UserDto user);
}
