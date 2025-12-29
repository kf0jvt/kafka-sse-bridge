from kafka import KafkaConsumer
from flask import Flask, Response
import json
import queue
import threading
import sys
import os
import logging
from dotenv import load_dotenv
from dataclasses import dataclass

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)

# Queue to pass messages from Kafka consumer to SSE clients
message_queue = queue.Queue()   

@dataclass
class KafkaConfig:
    consumer_bootstrap_1: list[str]
    consumer_bootstrap_2: list[str]
    kafka_topic: str
    ssl_cert_file: str
    ssl_key_file: str
    ssl_ca_file: str

app = Flask(__name__)

def kafka_consumer_thread(kafka_config: KafkaConfig) -> None:
    """Background thread to consume Kafka messages"""
    consumer = KafkaConsumer(
        kafka_config.kafka_topic,
        bootstrap_servers=kafka_config.consumer_bootstrap_1,
        security_protocol='SSL',
        ssl_certfile=kafka_config.ssl_cert_file,
        ssl_keyfile=kafka_config.ssl_key_file,
        ssl_cafile=kafka_config.ssl_ca_file,
        auto_offset_reset='latest',
        enable_auto_commit=True,
        value_deserializer=lambda m: m.decode('utf-8')
    )
    
    logging.info(f"Connected to Kafka, subscribed to topic: {kafka_config.kafka_topic}")
    
    for message in consumer:
        logging.debug(f"Received message: {message.value}")
        # Put message in queue for all SSE clients
        message_queue.put(message.value)

def event_stream():
    """Generator function for SSE events"""
    while True:
        # Block until a message is available
        message = message_queue.get()
        # Format as SSE
        yield f"data: {message}\n\n"

@app.route('/events')
def sse():
    """SSE endpoint for clients to connect"""
    return Response(event_stream(), mimetype='text/event-stream')

@app.route('/health')
def health():
    """Health check endpoint"""
    return {'status': 'ok'}

if __name__ == '__main__':
    # Load environment from .env file
    load_dotenv()

    # Check for necessary minimum information
    unrecoverable_error = False
    for variable_name in ["CONSUMER_BOOTSTRAP_1", 
                          "CONSUMER_BOOTSTRAP_2", 
                          "KAFKA_TOPIC", 
                          "KAFKA_CERT_FILE",
                          "KAFKA_KEY_FILE",
                          "KAFKA_CA_FILE"]:
        if not os.getenv(variable_name, None):
            logging.critical(f"{variable_name} is not found in system ENV or in .env file. Cannot continue")
            unrecoverable_error = True
            continue
        if os.getenv(variable_name) == "":
            logging.critical(f"{variable_name} is set to an empty string. Cannot continue")
            unrecoverable_error = True
    if unrecoverable_error:
        sys.exit(1)
        

    consumer_bootstrap_1 = os.getenv("CONSUMER_BOOTSTRAP_1").split(",")
    consumer_bootstrap_2 = os.getenv("CONSUMER_BOOTSTRAP_2").split(",")
    kafka_topic = os.getenv("KAFKA_TOPIC")

    

    kafka_config = KafkaConfig(consumer_bootstrap_1, 
                               consumer_bootstrap_2, 
                               kafka_topic, 
                               "", 
                               "", 
                               "")

    # Start Kafka consumer in background thread
    consumer_thread = threading.Thread(target=kafka_consumer_thread, args=(kafka_config,), daemon=True)
    consumer_thread.start()
    
    # Start Flask server
    print("Starting SSE server on http://0.0.0.0:5000")
    print("Connect to http://localhost:5000/events to receive messages")
    app.run(host='0.0.0.0', port=5000, threaded=True)
