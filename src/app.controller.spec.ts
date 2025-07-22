import { TestingModule, Test } from "@nestjs/testing";
import { AppService } from "./app.service";
import { AppController } from "./app.controller";

describe("AppController", () => {
    let appController: AppController;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService]
        }).compile();
        appController = app.get<AppController>(AppController);
    });

    describe("root", () => {
        it("should return 'Hello AITHENA!'", () => {
            expect(appController.getHello()).toBe("Hello AITHENA!");
        });
    });
});