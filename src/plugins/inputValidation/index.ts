import { Instance } from "../../types/instance";
import { Plugin } from "../../types/options";

export interface InpuitValidationConfig {
  dateFormat: string;
}

const inputValidationConfig: InpuitValidationConfig = {
  dateFormat: "d/m/Y H:i",
};

function inputValidation(pluginConfig?: Partial<InpuitValidationConfig>): Plugin {
    const config = { ...inputValidationConfig, ...pluginConfig };
    
    return (parent: Instance) => {
        // if (!parent.config.allowInput){
        //   console.warn('Duration plugin will not work without allowInput set to true');
        //   return {};
        // }

        parent.config.dateFormat = config.dateFormat;

        function setup() {
          let oldSetDate = parent.setDate;
          parent.setDate = function setDate(date: string | number | Date | import("../../types/options").DateOption[],
            triggerChange = false,
            format = config.dateFormat) {
              console.log('new setDate', date);
              oldSetDate(date, triggerChange, format)
          }
        }

        function valueUpdated() {
        }

        return {
            onParseConfig() {
              parent.config.mode = "single";
              parent.config.allowInput = true;
            },
            onValueUpdate: valueUpdated,
            onReady: [
                setup,
                () => {
                    parent.loadedPlugins.push("inputValidation");
                },
            ]
          };
    };
}  

export default inputValidation;