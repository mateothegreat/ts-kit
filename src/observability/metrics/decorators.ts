export const ObservableDecorators = [
  "Function",
  "AsyncFunction",
  "AsyncGeneratorFunction",
  "GeneratorFunction",
  "Generator",
  "AsyncGenerator",
  "AsyncGeneratorFunction",
  "AsyncGeneratorFunction",
];
import { performance } from "perf_hooks";
import { MetricsReporter } from "./reporter";
import { Timer } from "./timer";

// @ts-ignore
export function measure(target: Function, context) {
  console.log("target", target);
  console.log("context", context, typeof context);
  if (context.kind === "method") {
    return function (...args: any[]) {
      const start = performance.now();
      // @ts-ignore
      const result = target.apply(this, args);
      const end = performance.now();

      console.log(`Execution time: ${end - start} milliseconds`);
      return result;
    };
  }
}

export function TrackMetrics(key: string, reporter: MetricsReporter) {
  return function (
    target: Function,
    context: ClassMethodDecoratorContext
  ): Function {
    // if (context.kind !== "method") {
    //   throw new TypeError("TrackMetrics can only be applied to methods.");
    // }

    console.log("target", target);
    console.log("target", target.name);
    console.log("target", target.constructor.name);

    if (!ObservableDecorators.includes(target.constructor.name)) {
      throw new TypeError(
        `decorator can only be applied to methods of type ${ObservableDecorators.join(
          ", "
        )}, but got ${target.constructor.name}.`
      );
    }
    // console.log("context", context);

    return async function (this: any, ...args: any[]) {
      const timer = new Timer();
      timer.start();
      try {
        const result = await target.apply(this, args);
        const duration = timer.stop();
        reporter.capture({
          [`${key}.duration`]: duration,
          [`${key}.method`]: context.name.toString(),
          [`${key}.success`]: true,
        });
        return result;
      } catch (e) {
        reporter.capture({
          [`${key}.duration`]: 234234,
          [`${key}.method`]: context.name.toString(),
          [`${key}.error`]: e instanceof Error ? e.message : String(e),
          [`${key}.success`]: false,
        });
        throw e;
      }
    };
  };
}
// /**
//  * Decorator to automatically time and trace method execution.
//  *
//  * Emits metrics: { duration, method, success, error }
//  * @param key The key under which metrics will be reported.
//  * @param reporter The metrics reporter instance to capture the metrics.
//  */
// export function TrackMetrics(key: string, reporter: MetricsReporter) {
//   return function (
//     originalMethod: Function,
//     context: ClassMemberDecoratorContext,
//     target: any
//   ): Function {
//     console.log("originalMethod", originalMethod);
//     console.log("originalMethod", originalMethod.constructor.name);

//     console.log("target", target.value.constructor.name);
//     // console.log("context", context);

//     if (!ObservableDecorators.includes(target.value.constructor.name)) {
//       throw new TypeError(
//         `decorator can only be applied to methods of type ${ObservableDecorators.join(
//           ", "
//         )}, but got ${originalMethod.constructor.name}.`
//       );
//     }

//     return async function (this: any, ...args: any[]) {
//       const timer = new Timer();
//       try {
//         const result = await target.value.apply(this, args);

//         reporter.capture({
//           [`${key}.duration`]: timer.stop(),
//           [`${key}.method`]: context.name.toString(),
//           [`${key}.success`]: true,
//         });

//         console.log("result", result);

//         return result;
//       } catch (e) {
//         reporter.capture({
//           [`${key}.duration`]: timer.stop(),
//           [`${key}.method`]: context.name.toString(),
//           [`${key}.error`]: e instanceof Error ? e.message : String(e),
//           [`${key}.success`]: false,
//         });
//         throw e;
//       }
//     };
//   };
// }
