//! # hpack-html
//!
//! High-performance .hpack HTML packet decompressor.
//!
//! Decodes binary .hpack packets produced by the `hpack-html-js` JavaScript compressor,
//! decompresses the HTML body (DEFLATE or gzip), and verifies CRC32 integrity.
//!
//! ## Example
//!
//! ```rust,no_run
//! let packed: &[u8] = &[/* .hpack bytes */];
//! let result = hpack_html::unpack(packed).unwrap();
//! println!("URL: {}", result.url);
//! println!("HTML: {} bytes", result.html.len());
//! ```

mod decoder;
mod error;
mod varint;

pub use decoder::{
    read_headers, unpack, unpack_with_options, CompressionAlgorithm, UnpackOptions, UnpackResult,
};
pub use error::Error;
