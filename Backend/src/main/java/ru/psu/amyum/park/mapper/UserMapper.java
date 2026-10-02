package ru.psu.amyum.park.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;
import ru.psu.amyum.park.dto.UserDto;
import ru.psu.amyum.park.model.User;


@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
        unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {
    UserDto toDto(User user);
    User toEntity(UserDto userDto);
}