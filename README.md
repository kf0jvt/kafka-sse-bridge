# Create Certificates
In your ServiceNow instance, navigate to `All -> Certificate Generator -> Instance PKI Certificate Generator`.
- Provide a password for the certificate you're going to generate
- Download the keystore (keystore.p12)
- Download the Truststore (truststore.p12)

## Turn Java keystores into PEM files
Extract all three certificates from truststore.p12 into a pem file

```
# Export all CA certs into a single PEM file
keytool -exportcert -alias "digicert root certificate" \
  -keystore truststore.p12 -rfc -file ca-cert.pem \
  -storepass password_you_used_when_you_created_it

keytool -exportcert -alias "digicert issuing certificate" \
  -keystore truststore.p12 -rfc -storepass password_you_used_when_you_created_it >> ca-cert.pem

keytool -exportcert -alias "entrust certificate" \
  -keystore truststore.p12 -rfc -storepass password_you_used_when_you_created_it >> ca-cert.pem
```

Extract the client certificate and private key from keystore.p12

```
openssl pkcs12 -in keystore.p12 -nodes -nocerts \
  -out client-key.pem -passin pass:password_you_used_when_you_created_it

# Export everything including chain
openssl pkcs12 -in keystore.p12 -nokeys \
  -out client-cert-chain.pem -passin pass:KevinKevinKevin
```

# Get information for your connection
## Bootstrap urls
- In your ServiceNow instance, navigate to `All -> Hermes Messaging Service -> Diagnostics`
- Expand the `Setup Information` container. 
- Copy the Consumer Bootstrap 1 information.

# Application setup
Initialize your python environment 

`source bin/ativate`

Install app dependencies with

`pip install -r requirements.txt`

Run the application

`python app.py`