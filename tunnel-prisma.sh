#!/bin/bash

# Exit on error
set -e

# Store the SSH PID for cleanup
SSH_PID=""

# Cleanup function
cleanup() {
    echo ""
    echo "Received termination signal, cleaning up..."
    
    # Kill SSH tunnel if it's running
    if [ ! -z "$SSH_PID" ]; then
        echo "Closing SSH tunnel (PID: $SSH_PID)..."
        kill $SSH_PID 2>/dev/null || true
    fi
    
    # Kill any remaining SSH tunnels to the same port
    lsof -ti:5432 | xargs kill -9 2>/dev/null || true
    
    echo "Cleanup complete. Exiting."
    exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM EXIT

echo "Starting SSH tunnel..."
cd ~/Desktop/FAF/Sem5/PP

# Start SSH tunnel in the background
ssh -f -N -i main-key-pair.pem -L 5432:172.18.0.2:5432 ubuntu@13.53.227.121

# Get the PID of the SSH process
SSH_PID=$(ps aux | grep "ssh -f -N -i main-key-pair.pem" | grep -v grep | awk '{print $2}')

echo "SSH tunnel established (PID: $SSH_PID)"
echo "Port forwarding: localhost:5432 -> 172.18.0.2:5432"
echo ""

# Give SSH a moment to establish the connection
sleep 2

echo "Starting Prisma Studio..."
cd ~/Desktop/FAF/Sem5/PP/BlockSign-Server

# Run Prisma Studio (this will block until terminated)
npm run prisma:studio

# If npm run exits normally, cleanup will be called via the EXIT trap
