import { Instance } from "../../types/instance";
import { tokenRegex, token } from "../../utils/formatting";
import { Plugin } from "../../types/options";

export interface InpuitValidationConfig {
  dateFormat: string;
  placeholder: string;
  instantValidate: boolean;
  invalidClassName: string;
  isValidAttrName: string
}

const inputValidationConfig: InpuitValidationConfig = {
  dateFormat: "d/m/Y H:i",
  placeholder: "",
  instantValidate: true,
  invalidClassName: "format-invalid",
  isValidAttrName: "data-is-valid"
};

function inputValidation(pluginConfig?: Partial<InpuitValidationConfig>): Plugin {
    const config = { ...inputValidationConfig, ...pluginConfig };
    let separator: string;
    let constructedRe: string;

    return (parent: Instance) => {
      let invalidValueAttribute: string = "data-invalid-value";

      parent.config.dateFormat = config.dateFormat;

      function whenValid() {
        parent._input.setAttribute(config.isValidAttrName, 'false');
        parent._input.removeAttribute(invalidValueAttribute);
        parent._input.classList.remove(config.invalidClassName);
      }

      function whenInvalid(value: string) {
        parent._input.setAttribute(config.isValidAttrName, 'false');
        parent._input.setAttribute(invalidValueAttribute, value);
        parent._input.classList.add(config.invalidClassName);
      }

      function durationOnValid(date: string) {
        const inputs = [
          parent.hourElement as HTMLInputElement,
          parent.minuteElement as HTMLInputElement,
          parent.secondElement as HTMLInputElement
        ]
        
        let arr = date.split(separator);
        if (arr.length < 1)
          return;
        arr.forEach((val, i: number) => {
          if (isNaN(parseInt(val)) || i > 2)
            return;
          if (inputs[i])
            inputs[i].value = val;
        });
        if(parent.selectedDates.length !== 0)
          parent.timeContainer?.dispatchEvent(new Event('increment'));
      }

      function overrideSetDate() {
        let baseSetDate = parent.setDate;
        parent.setDate = function setDate(date: string | number | Date | import("../../types/options").DateOption[],
          triggerChange = false,
          format = config.dateFormat) {
            if (!date) {
              baseSetDate(date, triggerChange, format);
              return;
            }
            let re = new RegExp(constructedRe);
            let isValid = re.test(date.toString());
            if(isValid){
              whenValid();
              if (parent.loadedPlugins.indexOf("duration") === -1 || parent.selectedDates.length === 0)
                baseSetDate(date, triggerChange, format);
              else
                durationOnValid(date.toString());
            }
            else {
              whenInvalid(date.toString());
            }
        }
      }

      function setup() {
        parent.input.placeholder = config.placeholder ? config.placeholder : config.dateFormat;
      }

      function constructRegEx() {
        constructedRe = parent.config.dateFormat
          .split("")
          .map((c, i, arr) => {
            if(c == "I") //temp workaround for duration plugin
              return "(\\d\\d)";
            else if( tokenRegex[c as token] && arr[i - 1] !== "\\")
              return tokenRegex[c as token];
            else if (c !== "\\") {
              separator = c;
              return "\\" + c
            }
            else 
              return "";
          })
          .join("");
      }

      function valueChanged(parsedDate: Date[], dateString: string) {
        if (parent.loadedPlugins.indexOf("duration") === -1) 
          return;
          console.log('dateStr', parsedDate);
          let arr = dateString.split(separator);
        if (arr.length < 1)
          return;
        let val = parent._input.getAttribute(invalidValueAttribute);
        if(val && 
          arr[0] === parent.config.defaultHour.toString() &&
          arr[1] === parent.config.defaultMinute.toString()) {
          parent.input.value = val;
        } else {
          whenValid();
        }
          
      }

      return {
          onParseConfig() {
            parent.config.mode = "single";
            parent.config.allowInput = true;
          },
          onValueUpdate: valueChanged,
          onReady: [
              setup,
              overrideSetDate,
              constructRegEx,
              () => {
                  parent.loadedPlugins.push("inputValidation");
              },
          ]
        };
    };
}  

export default inputValidation;