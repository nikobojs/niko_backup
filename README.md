# Backup tool

Simple backup system that makes it easy to make cyclic backups from simple postgres and s3 endpoints.

Run the program every night and the backups will be made according to the `config.json` file.

### Decrypt openssl password encryption:

s3 backups:
```bash
openssl enc -d -aes256 -pass pass:abc123 -in output/encrypted_backup.enc | tar xvf - --directory=output
```

postgres backups:
```bash
openssl enc -d -aes256 -pass pass:abc123 -in output/encrypted_backup.enc | gunzip > output/decrypted_backup
```
