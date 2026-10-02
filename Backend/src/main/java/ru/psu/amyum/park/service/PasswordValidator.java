package ru.psu.amyum.park.service;

import java.util.regex.Pattern;

public class PasswordValidator {

    private static final int MIN_LENGTH = 8;
    private static final Pattern DIGIT_PATTERN = Pattern.compile("\\d");
    private static final Pattern LETTER_PATTERN = Pattern.compile("[a-zA-Z]");

    public static boolean isValid(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            return false;
        }
        if (!DIGIT_PATTERN.matcher(password).find()) {
            return false;
        }
        if (!LETTER_PATTERN.matcher(password).find()) {
            return false;
        }
        return true;
    }
}