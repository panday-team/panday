// Logger utility - Simple logging with timestamps

function log(message, data = null) {
    // Format timestamp with date and time to match frontend logger
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString(undefined, { hour12: false });
    
    if (data) {
        console.log(`[${formattedDate} ${formattedTime}] ${message}`, data);
    } else {
        console.log(`[${formattedDate} ${formattedTime}] ${message}`);
    }
}

module.exports = { log };