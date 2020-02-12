export class Timing {

    private static last = -1;

    /**
     * Returns time since last measurement.
     */
    public static measure() {
        if (Timing.last === -1) {
            Timing.last = Date.now();
            return 0;
        } else {
            const now = Date.now();
            const duration = now - Timing.last;
            Timing.last = now;
            return duration;
        }
    }

}
