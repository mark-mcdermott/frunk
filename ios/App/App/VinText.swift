import Foundation

/// Finding a VIN in whatever the camera read: a barcode's payload or a line of OCR text.
///
/// OCR confuses look-alike characters, and a VIN is built to survive that. It never
/// contains I, O or Q, so those are read as 1, 0 and 0. Its ninth character is a check
/// digit over the other sixteen, so a misread almost never passes. A candidate is kept
/// only if it checks out. The scanner keeps looking until one does, rather than
/// handing the form a plausible-looking wrong VIN.
///
/// Free of UIKit so it compiles and runs on its own: `swiftc VinText.swift VinTextCheck.swift`.
enum VinText {
    private static let weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

    private static func value(of character: Character) -> Int? {
        if let digit = character.wholeNumberValue { return digit }
        switch character {
        case "A", "J": return 1
        case "B", "K", "S": return 2
        case "C", "L", "T": return 3
        case "D", "M", "U": return 4
        case "E", "N", "V": return 5
        case "F", "W": return 6
        case "G", "P", "X": return 7
        case "H", "Y": return 8
        case "R", "Z": return 9
        default: return nil
        }
    }

    /// True for a 17-character VIN whose ninth character matches its check digit.
    static func isValid(_ vin: String) -> Bool {
        let characters = Array(vin)
        guard characters.count == 17 else { return false }
        var sum = 0
        for (index, character) in characters.enumerated() {
            guard let value = value(of: character) else { return false }
            sum += value * weights[index]
        }
        let remainder = sum % 11
        let expected: Character = remainder == 10 ? "X" : Character(String(remainder))
        return characters[8] == expected
    }

    /// Upper case, letters and digits only, with I, O and Q read as the digits they mimic.
    static func normalize(_ text: String) -> String {
        String(
            text.uppercased().compactMap { character -> Character? in
                switch character {
                case "I": return "1"
                case "O", "Q": return "0"
                default: return character.isASCII && (character.isLetter || character.isNumber) ? character : nil
                }
            }
        )
    }

    /// The first valid VIN anywhere in the text, or nil. Barcodes on door-jamb stickers
    /// often carry a leading "I" (Code 39's import marker), which normalizing turns into a
    /// "1" in front, so every 17-character window is tried, not only the whole string.
    static func firstVin(in text: String) -> String? {
        let characters = Array(normalize(text))
        guard characters.count >= 17 else { return nil }
        for start in 0...(characters.count - 17) {
            let candidate = String(characters[start..<(start + 17)])
            if isValid(candidate) { return candidate }
        }
        return nil
    }
}
