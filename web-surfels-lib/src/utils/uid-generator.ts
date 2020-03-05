export class UidGenerator {

    private static nextID;

    static genUID(): number {
        return UidGenerator.nextID++;
    }
}
