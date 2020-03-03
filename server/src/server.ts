import { Timing } from 'web-surfels';

Timing.measure();
console.log('server running');

setTimeout(() => {
    console.log('a bit later', Timing.measure());
}, 100);
