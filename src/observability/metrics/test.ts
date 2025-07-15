import { measure } from "./decorators";

class Test {
  @measure
  async run() {
    console.log(new Date().toISOString(), "run");
    await new Promise((resolve) => setTimeout(resolve, 100));
    return "done";
  }
}

const test = new Test();
test.run();
console.log(new Date().toISOString(), "done");
