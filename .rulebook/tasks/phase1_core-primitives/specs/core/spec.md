# Core Primitives Specification

## ADDED Requirements

### Requirement: VarInt Encoding
The system SHALL encode unsigned integers using protobuf-style variable-length encoding where each byte uses 7 data bits and 1 continuation bit.

#### Scenario: Encode small value
Given an integer value of 127
When VarInt encoding is applied
Then the output MUST be a single byte `0x7F`

#### Scenario: Encode multi-byte value
Given an integer value of 300
When VarInt encoding is applied
Then the output MUST be two bytes `0xAC 0x02`

#### Scenario: Decode roundtrip
Given any integer value between 0 and 2^49-1
When the value is encoded then decoded
Then the decoded value MUST equal the original value

### Requirement: CRC32 Checksum
The system SHALL compute CRC32 checksums using the IEEE 802.3 polynomial (0xEDB88320) compatible with ISO 3309.

#### Scenario: Known test vector
Given the ASCII string "123456789"
When CRC32 is computed
Then the result MUST be 0xCBF43926

#### Scenario: Empty input
Given an empty byte array
When CRC32 is computed
Then the result MUST be 0x00000000

### Requirement: Format Constants
The system SHALL define the .hpack binary format constants as immutable values shared across all SDK implementations.

#### Scenario: Magic bytes identification
Given a byte sequence starting with `0x89 0x48 0x50 0x4B`
When the magic bytes are validated
Then the sequence MUST be recognized as a valid .hpack packet

#### Scenario: Flag byte encoding
Given minified=true, checksum=true, compression=deflate
When the flags byte is encoded
Then bit 0 MUST be 1, bit 1 MUST be 1, bits 2-3 MUST be 00

### Requirement: Shared Types
The system SHALL export TypeScript types that define the public API contract for pack and unpack operations.

#### Scenario: PackOptions type
Given a consumer importing PackOptions
When the type is used
Then it MUST require `url: string` and accept optional `etag`, `signature`, `contentType`, `timestamp`, `encoding`, `custom`, `level`, `minify`, `checksum`
