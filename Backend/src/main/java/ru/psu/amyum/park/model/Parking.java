package ru.psu.amyum.park.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "parkings")
public class Parking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String location;
    private Integer parking_average;
    private Integer parking_free;

    public Parking(Integer id, String location, Integer parking_average, Integer parking_free) {
        this.id = id;
        this.location = location;
        this.parking_average = parking_average;
        this.parking_free = parking_free;
    }

    public Parking() {

    }

}