export class UidGenerator {

    private static nextID = 0;

    static genUID(): number {
        return UidGenerator.nextID++;
    }
}
