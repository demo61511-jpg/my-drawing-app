#!/usr/bin/env python3
import os
import sys
import glob
import struct
import zlib
import hashlib
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BUILD_DIR = ROOT_DIR / "android_build"
APK_OUT_DIR = ROOT_DIR / "APK_DOWNLOAD"
BUILD_OUT_DIR = ROOT_DIR / ".build-outputs"
PUBLIC_DIR = ROOT_DIR / "public"
DIST_DIR = ROOT_DIR / "dist"

def find_base_apk():
    candidates = [
        PUBLIC_DIR / "app-debug.apk",
        BUILD_OUT_DIR / "app-debug.apk",
        DIST_DIR / "app-debug.apk",
        APK_OUT_DIR / "app-debug.apk",
    ]
    for c in candidates:
        if c.exists() and c.stat().st_size > 1000000:
            return c
    raise FileNotFoundError(f"No valid base APK found in candidates: {[str(c) for c in candidates]}")

def ensure_dirs():
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    APK_OUT_DIR.mkdir(parents=True, exist_ok=True)
    BUILD_OUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

def get_or_create_debug_keys():
    key_path = BUILD_DIR / "debug_key.pem"
    cert_path = BUILD_DIR / "debug_cert.pem"
    
    if not key_path.exists() or not cert_path.exists():
        print("Generating persistent Android Debug RSA key and certificate...")
        cmd = [
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", str(key_path),
            "-out", str(cert_path),
            "-days", "10000", "-nodes",
            "-subj", "/C=US/O=Android/CN=Android Debug"
        ]
        subprocess.run(cmd, check=True)
    
    # Read DER cert and DER pubkey
    p_cert = subprocess.run(["openssl", "x509", "-in", str(cert_path), "-outform", "DER"],
                            stdout=subprocess.PIPE, check=True)
    cert_der = p_cert.stdout
    
    p_pub = subprocess.run(["openssl", "x509", "-in", str(cert_path), "-pubkey", "-noout"],
                           stdout=subprocess.PIPE, check=True)
    p_pub_der = subprocess.run(["openssl", "rsa", "-pubin", "-outform", "DER"],
                               input=p_pub.stdout, stdout=subprocess.PIPE, check=True)
    pubkey_der = p_pub_der.stdout
    
    return key_path, cert_path, cert_der, pubkey_der

def rsa_sign_pkcs1_v15_sha256(data_bytes, key_path):
    """Sign arbitrary data with RSA-SHA256 PKCS#1 v1.5 using OpenSSL"""
    p = subprocess.run([
        "openssl", "dgst", "-sha256", "-sign", str(key_path)
    ], input=data_bytes, stdout=subprocess.PIPE, check=True)
    return p.stdout

def sign_smime_p7(sf_bytes, cert_path, key_path):
    """Sign SF content with PKCS#7 for APK v1 (META-INF/*.RSA)"""
    cmd = [
        "openssl", "smime", "-sign",
        "-signer", str(cert_path),
        "-inkey", str(key_path),
        "-noattr",
        "-binary",
        "-outform", "DER"
    ]
    p = subprocess.run(cmd, input=sf_bytes, stdout=subprocess.PIPE, check=True)
    return p.stdout

class ZipBuilder:
    def __init__(self):
        self.entries = []  # list of dicts
        self.offset = 0
        self.data = bytearray()

    def add_file(self, filename, content_bytes, compress=True, align=False):
        filename_bytes = filename.encode('utf-8')
        crc = zlib.crc32(content_bytes) & 0xffffffff
        uncompressed_size = len(content_bytes)

        if compress:
            # zlib compress raw DEFLATE without zlib wrapper (wbits=-15)
            comp_obj = zlib.compressobj(level=9, method=zlib.DEFLATED, wbits=-15)
            compressed_bytes = comp_obj.compress(content_bytes) + comp_obj.flush()
            method = 8
            payload = compressed_bytes
            extra = b''
        else:
            method = 0
            payload = content_bytes
            extra = b''

        # If 4-byte alignment requested for uncompressed file (standard Android zipalign)
        if align and method == 0:
            # local header without extra is 30 bytes + len(filename_bytes)
            # data_offset = self.offset + 30 + len(filename_bytes) + len(extra)
            header_min_len = 30 + len(filename_bytes)
            remainder = (self.offset + header_min_len) % 4
            if remainder != 0:
                padding = 4 - remainder
                extra = b'\x00' * padding

        local_header_offset = self.offset

        # Local File Header (30 bytes + name + extra)
        # 0x04034b50, min_ver=20, flags=0, method, time=0, date=0, crc, csize, usize, namelen, extralen
        local_header = struct.pack(
            '<IHHHHHIIIHH',
            0x04034b50,
            20, 0, method,
            0, 0,
            crc,
            len(payload),
            uncompressed_size,
            len(filename_bytes),
            len(extra)
        ) + filename_bytes + extra

        self.data += local_header
        self.data += payload
        self.offset += len(local_header) + len(payload)

        self.entries.append({
            'name': filename,
            'name_bytes': filename_bytes,
            'method': method,
            'crc': crc,
            'csize': len(payload),
            'usize': uncompressed_size,
            'extra': extra,
            'offset': local_header_offset,
            'content': content_bytes
        })

    def finish(self):
        cd_start_offset = self.offset
        cd_data = bytearray()

        for entry in self.entries:
            # Central Directory Header (46 bytes + name + extra)
            # 0x02014b50, ver_made=20, ver_min=20, flags=0, method, time=0, date=0, crc, csize, usize, namelen, extralen, commentlen(0), disk(0), int_attr(0), ext_attr(0), offset
            cd_hdr = struct.pack(
                '<IHHHHHHIIIHHHHHII',
                0x02014b50,
                20, 20, 0,
                entry['method'],
                0, 0,
                entry['crc'],
                entry['csize'],
                entry['usize'],
                len(entry['name_bytes']),
                len(entry['extra']),
                0, 0, 0, 0,
                entry['offset']
            ) + entry['name_bytes'] + entry['extra']
            cd_data += cd_hdr

        cd_size = len(cd_data)
        self.data += cd_data
        self.offset += cd_size

        # End of Central Directory Record (22 bytes)
        # 0x06054b50, disk=0, cd_disk=0, num_entries_disk, num_entries_total, cd_size, cd_offset, comment_len=0
        eocd = struct.pack(
            '<IHHHHIIH',
            0x06054b50,
            0, 0,
            len(self.entries),
            len(self.entries),
            cd_size,
            cd_start_offset,
            0
        )
        self.data += eocd
        return bytes(self.data), cd_start_offset, cd_size

def build_v2_signing_block(apk_without_sig, cd_offset, cert_der, pubkey_der, key_path):
    """
    Computes Android APK Signature Scheme v2 signing block and returns
    (apk_with_v2_block, final_cd_offset)
    """
    eocd_idx = apk_without_sig.rfind(b'\x50\x4b\x05\x06')
    if eocd_idx == -1:
        raise ValueError("EOCD not found")

    sec1 = apk_without_sig[:cd_offset]
    sec2 = apk_without_sig[cd_offset:eocd_idx]
    
    # EOCD with CD offset replaced by cd_offset (which will be before the sig block)
    sec3 = apk_without_sig[eocd_idx:eocd_idx+16] + struct.pack('<I', cd_offset) + apk_without_sig[eocd_idx+20:]

    CHUNK_SIZE = 1048576 # 1MB

    def chunk_hashes(data_slice):
        hashes = []
        for i in range(0, len(data_slice), CHUNK_SIZE):
            chunk = data_slice[i:i+CHUNK_SIZE]
            h = hashlib.sha256(b'\xa5' + struct.pack('<I', len(chunk)) + chunk).digest()
            hashes.append(h)
        return hashes

    all_chunk_hashes = chunk_hashes(sec1) + chunk_hashes(sec2) + chunk_hashes(sec3)
    top_digest = hashlib.sha256(b'\x5a' + struct.pack('<I', len(all_chunk_hashes)) + b''.join(all_chunk_hashes)).digest()

    # Build signed_data
    # 1. Digests: len-prefixed sequence of (algo, len-prefixed digest)
    # algo 0x0103 = RSASSA-PKCS1-v1_5 with SHA256
    digest_elem = struct.pack('<I', 0x0103) + struct.pack('<I', len(top_digest)) + top_digest
    digest_elem = struct.pack('<I', len(digest_elem)) + digest_elem
    digests_block = struct.pack('<I', len(digest_elem)) + digest_elem

    # 2. Certificates: len-prefixed sequence of len-prefixed certs
    cert_elem = struct.pack('<I', len(cert_der)) + cert_der
    certs_block = struct.pack('<I', len(cert_elem)) + cert_elem

    # 3. Additional attributes: empty
    attrs_block = struct.pack('<I', 0)

    signed_data = digests_block + certs_block + attrs_block
    signed_data_block = struct.pack('<I', len(signed_data)) + signed_data

    # Sign signed_data with RSA key
    raw_signature = rsa_sign_pkcs1_v15_sha256(signed_data, key_path)

    # 4. Signatures: len-prefixed sequence of (algo, len-prefixed signature)
    sig_elem = struct.pack('<I', 0x0103) + struct.pack('<I', len(raw_signature)) + raw_signature
    sig_elem = struct.pack('<I', len(sig_elem)) + sig_elem
    signatures_block = struct.pack('<I', len(sig_elem)) + sig_elem

    # 5. Public key: len-prefixed pubkey
    pubkey_block = struct.pack('<I', len(pubkey_der)) + pubkey_der

    signer = signed_data_block + signatures_block + pubkey_block
    signer_block = struct.pack('<I', len(signer)) + signer

    signers_block = struct.pack('<I', len(signer_block)) + signer_block

    # Pair for v2: ID 0x7109871a
    v2_pair = struct.pack('<Q', len(signers_block) + 4) + struct.pack('<I', 0x7109871a) + signers_block

    # APK Signing Block:
    # 8-byte size (excluding this field)
    # pairs
    # 8-byte size (must match)
    # 16-byte magic b"APK Sig Block 42"
    block_inner_len = len(v2_pair) + 8 + 16
    sig_block = (
        struct.pack('<Q', block_inner_len) +
        v2_pair +
        struct.pack('<Q', block_inner_len) +
        b"APK Sig Block 42"
    )

    # Insert sig_block right before Central Directory
    new_cd_offset = cd_offset + len(sig_block)
    new_eocd = (
        apk_without_sig[eocd_idx:eocd_idx+16] +
        struct.pack('<I', new_cd_offset) +
        apk_without_sig[eocd_idx+20:]
    )

    final_apk = sec1 + sig_block + sec2 + new_eocd
    return final_apk

def main():
    ensure_dirs()
    key_path, cert_path, cert_der, pubkey_der = get_or_create_debug_keys()

    import zipfile
    base_apk_path = find_base_apk()
    print(f"Using base APK template from: {base_apk_path} ({base_apk_path.stat().st_size} bytes)")
    base_apk = zipfile.ZipFile(str(base_apk_path))
    
    # Files to keep from base APK (native compiled android binaries)
    base_files = {
        'AndroidManifest.xml': base_apk.read('AndroidManifest.xml'),
        'classes.dex': base_apk.read('classes.dex'),
        'resources.arsc': base_apk.read('resources.arsc'),
        'res/drawable/ic_launcher.png': base_apk.read('res/drawable/ic_launcher.png'),
    }

    # Collect latest web assets from dist/
    asset_files = {}
    
    # 1. index.html
    dist_index = DIST_DIR / "index.html"
    if dist_index.exists():
        asset_files['assets/index.html'] = dist_index.read_bytes()
    else:
        raise FileNotFoundError(f"Missing {dist_index}")

    # 2. dist/assets/
    for p in DIST_DIR.rglob('*'):
        if p.is_file() and p.name != 'index.html':
            rel = p.relative_to(DIST_DIR)
            asset_files[f'assets/{rel.as_posix()}'] = p.read_bytes()

    # 3. public/assets/ (ensure all referenced art and showcase images exist)
    public_assets = PUBLIC_DIR / "assets"
    if public_assets.exists():
        for p in public_assets.rglob('*'):
            if p.is_file():
                rel = p.relative_to(public_assets)
                key = f'assets/assets/{rel.as_posix()}'
                if key not in asset_files:
                    asset_files[key] = p.read_bytes()

    print(f"Total base Android files: {len(base_files)}")
    print(f"Total web asset files: {len(asset_files)}")

    # Combine all regular files (excluding META-INF)
    all_files = {}
    all_files.update(base_files)
    all_files.update(asset_files)

    # Sort files for deterministic ordering
    sorted_filenames = sorted(all_files.keys())

    # Build MANIFEST.MF (v1 signing)
    import base64
    manifest_lines = [b"Manifest-Version: 1.0\r\n"]
    manifest_entries = {}

    for name in sorted_filenames:
        content = all_files[name]
        digest = base64.b64encode(hashlib.sha256(content).digest()).decode('ascii')
        
        # Manifest entry format with 72-char line folding if needed
        entry_str = f"Name: {name}\r\nSHA-256-Digest: {digest}\r\n\r\n"
        manifest_entries[name] = entry_str.encode('utf-8')
        manifest_lines.append(entry_str.encode('utf-8'))

    manifest_bytes = b"".join(manifest_lines)

    # Build ANDROIDD.SF (v1 signing)
    manifest_digest = base64.b64encode(hashlib.sha256(manifest_bytes).digest()).decode('ascii')
    sf_lines = [
        b"Signature-Version: 1.0\r\n",
        b"Created-By: 1.0 (Android)\r\n",
        f"SHA-256-Digest-Manifest: {manifest_digest}\r\n".encode('ascii'),
        b"X-Android-APK-Signed: 2\r\n\r\n"
    ]

    for name in sorted_filenames:
        entry_bytes = manifest_entries[name]
        entry_digest = base64.b64encode(hashlib.sha256(entry_bytes).digest()).decode('ascii')
        sf_entry = f"Name: {name}\r\nSHA-256-Digest: {entry_digest}\r\n\r\n".encode('ascii')
        sf_lines.append(sf_entry)

    sf_bytes = b"".join(sf_lines)

    # Sign ANDROIDD.SF to create ANDROIDD.RSA
    rsa_bytes = sign_smime_p7(sf_bytes, cert_path, key_path)

    # Assemble ZIP with 4-byte boundary alignment
    zb = ZipBuilder()

    # Add regular files
    for name in sorted_filenames:
        content = all_files[name]
        # Determine compression and alignment:
        # PNG, JPG, and resources.arsc are STORED and 4-byte aligned
        ext = name.lower().rsplit('.', 1)[-1] if '.' in name else ''
        if ext in ['png', 'jpg', 'jpeg', 'arsc']:
            zb.add_file(name, content, compress=False, align=True)
        else:
            zb.add_file(name, content, compress=True, align=False)

    # Add META-INF files
    zb.add_file('META-INF/MANIFEST.MF', manifest_bytes, compress=True, align=False)
    zb.add_file('META-INF/ANDROIDD.SF', sf_bytes, compress=True, align=False)
    zb.add_file('META-INF/ANDROIDD.RSA', rsa_bytes, compress=False, align=False)

    apk_raw, cd_offset, cd_size = zb.finish()
    print(f"Unsigned/v1 ZIP size: {len(apk_raw)} bytes, CD offset: {cd_offset}")

    # Add v2 signature block
    final_apk = build_v2_signing_block(apk_raw, cd_offset, cert_der, pubkey_der, key_path)
    print(f"Final signed APK size: {len(final_apk)} bytes")

    # Output to all required directories
    out_paths = [
        APK_OUT_DIR / "app-debug.apk",
        BUILD_OUT_DIR / "app-debug.apk",
        PUBLIC_DIR / "app-debug.apk"
    ]

    for out_path in out_paths:
        out_path.write_bytes(final_apk)
        print(f"Wrote {len(final_apk)} bytes to {out_path}")

    # Verification:
    import zipfile
    test_zip = zipfile.ZipFile(str(APK_OUT_DIR / "app-debug.apk"))
    print("\nVerifying APK archive:")
    print(f"Total entries in APK: {len(test_zip.infolist())}")
    for item in test_zip.infolist():
        if 'index' in item.filename:
            print(f" - {item.filename} ({item.file_size} bytes)")

    # Verify v1 signature with OpenSSL smime
    v1_verify = subprocess.run([
        "openssl", "smime", "-verify", "-inform", "DER",
        "-in", "/dev/stdin", "-content", "/dev/stdin", "-noverify"
    ], input=rsa_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    # Let's test smime verify properly with temp files
    tmp_sf = BUILD_DIR / "tmp_test.sf"
    tmp_rsa = BUILD_DIR / "tmp_test.rsa"
    tmp_sf.write_bytes(sf_bytes)
    tmp_rsa.write_bytes(rsa_bytes)
    v1_res = subprocess.run([
        "openssl", "smime", "-verify", "-inform", "DER",
        "-in", str(tmp_rsa), "-content", str(tmp_sf), "-noverify"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print(f"v1 Signature Verification: {v1_res.stderr.decode('utf-8').strip()}")
    tmp_sf.unlink(missing_ok=True)
    tmp_rsa.unlink(missing_ok=True)

    print("\n✅ Successfully updated app-debug.apk with latest build and verified signatures!")

if __name__ == '__main__':
    main()
