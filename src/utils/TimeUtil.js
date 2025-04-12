export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function sleepRandomSeconds() {
    let ms = Math.floor(Math.random() * 50000) + 10000
    return new Promise(resolve => setTimeout(resolve, ms))
}