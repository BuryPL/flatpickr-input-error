import { Instance } from "../../types/instance";
import { tokenRegex, token } from "../../utils/formatting";
import { Plugin } from "../../types/options";

export interface InpuitValidationConfig {
  dateFormat: string;
  placeholder: string;
  instantValidate: boolean;
  invalidClassName: string;
  isValidAttrName: string;
  classesToLeaveOnOriginal: string[];
  dynamicClasses: string[];
  attributesToCopy: string[];
  attributesToCut: string[];
}

const inputValidationConfig: InpuitValidationConfig = {
  dateFormat: "d/m/Y H:i",
  placeholder: "",
  instantValidate: true,
  invalidClassName: "format-invalid",
  isValidAttrName: "data-is-valid",
  classesToLeaveOnOriginal: ['flatpickr-input'],
  dynamicClasses: [],
  attributesToCopy: ['style', 'readonly', 'disabled'],
  attributesToCut: []
};

function inputValidation(pluginConfig?: Partial<InpuitValidationConfig>): Plugin {
    const config = {...inputValidationConfig};
    let constructedRe: string;
    let separator: string;

    return (parent: Instance) => {
      const self = {
        standinInput: {} as HTMLInputElement,
        invalidValueAttribute: "data-invalid-value",
        originalAtributes: {} as NamedNodeMap,
        observer: {} as MutationObserver
      }
      
      function adjustConfig() {
        parent.config.dateFormat = config.dateFormat = pluginConfig?.dateFormat ? pluginConfig?.dateFormat : config.dateFormat;
        config.placeholder = pluginConfig?.placeholder ? pluginConfig?.placeholder : config.placeholder;
        config.instantValidate = pluginConfig?.instantValidate ? pluginConfig?.instantValidate : config.instantValidate;
        config.invalidClassName = pluginConfig?.invalidClassName ? pluginConfig?.invalidClassName : config.invalidClassName;
        config.isValidAttrName = pluginConfig?.isValidAttrName ? pluginConfig?.isValidAttrName : config.isValidAttrName;
        config.dynamicClasses = pluginConfig?.dynamicClasses ? pluginConfig?.dynamicClasses : config.dynamicClasses;
        config.attributesToCut = pluginConfig?.attributesToCut ? pluginConfig?.attributesToCut : config.attributesToCut;
        if (pluginConfig?.classesToLeaveOnOriginal)
          config.classesToLeaveOnOriginal = inputValidationConfig.classesToLeaveOnOriginal.concat(pluginConfig.classesToLeaveOnOriginal);
        if (pluginConfig?.attributesToCopy)
          config.attributesToCopy = inputValidationConfig.attributesToCopy.concat(pluginConfig.attributesToCopy);
      }

      function setClassObserver() {
        if (!config.dynamicClasses || config.dynamicClasses.length === 0)
            return;

        let observerOptions = {
          attributes: true,
          attributeFilter: ['class'],
          attributeOldValue: true,
          childList: false,
          characterData: false,
          subtree: false
        };

        self.observer = new MutationObserver((mutationsList: MutationRecord[]) => {
          const lastMut = mutationsList[mutationsList.length - 1];
          const newElem = lastMut.target as Element;
          self.observer.disconnect();
          config.dynamicClasses.forEach((cl) => {
            if(newElem.classList.contains(cl) && lastMut.oldValue?.indexOf(cl) === -1) { //a class was added
              parent.element.classList.remove(cl);
              self.standinInput.classList.add(cl);
            } else if (self.standinInput.classList.contains(cl) && lastMut.oldValue?.indexOf(cl) === -1) { //a class was removed
              self.standinInput.classList.remove(cl);
            }
            self.observer.observe(parent.element, observerOptions);
          });
        })
        
        self.observer.observe(parent.element, observerOptions)
      }

      function assignAttributes(targetElement: Element) {
        self.originalAtributes = {...parent.element.attributes} as NamedNodeMap;
        config.attributesToCopy.forEach((attr) => {
        let originalAttr= parent.element.attributes.getNamedItem(attr);
        if (originalAttr)
          targetElement.setAttribute(attr, originalAttr.value);
        })

        if (config.attributesToCut && config.attributesToCut.length > 0) {
          config.attributesToCut.forEach((attr) => {
            let originalAttr= parent.element.attributes.getNamedItem(attr);
            if (originalAttr)
              targetElement.setAttribute(attr, originalAttr.value);
              parent.element.removeAttribute(attr);
            })
        }
      }

      function createAdditionalInput() {
        let standinInputLocal = parent._createElement<HTMLInputElement>(
          "input",
          "flatpickr-input-validation-mock-input"
        );

        parent.element.classList.forEach((val) => { 
          if(config.classesToLeaveOnOriginal.indexOf(val) > -1)
            return;
          standinInputLocal.classList.add(val); 
        });

        standinInputLocal.classList.forEach((val) => {
          parent.element.classList.remove(val);
        });

        assignAttributes(standinInputLocal);

        standinInputLocal.setAttribute('placeholder', config.placeholder)

        parent.input.after(standinInputLocal);

        self.standinInput = standinInputLocal as HTMLInputElement;

        parent.element.setAttribute('style', 'width: 0; margin: 0; padding: 0; border: 0;');
        parent.element.tabIndex = -1;
      }

      function appendEventListeners() {
        parent._bind(self.standinInput, 'blur', onBlur)
        self.standinInput.addEventListener("click", localOnClick)
      }

      function onBlur(e?: any) {
        if (!e || !e.target || !e.target.value)
          whenInvalid("");
        if (checkIfValid(e.target.value)){
          parent.input.value = e.target.value;
          whenValid();
          if (parent.loadedPlugins.indexOf("duration") !== -1)
            durationOnValid(e.target.value);
          else {
            if (parent.config.noCalendar && parent.config.enableTime)
              setHours(e.target.value);
            parent.input.dispatchEvent(new Event('blur'));
          }
            
        }
        else 
          whenInvalid(e.target.value);
      }

      function localOnClick(e: any) {
        e?.stopPropagation();
        parent.open(e, self.standinInput);
      }

      function whenValid() {
        parent._input.setAttribute(config.isValidAttrName, 'true');
        parent._input.removeAttribute(self.invalidValueAttribute);
        if (config.instantValidate)
          parent._input.classList.remove(config.invalidClassName);
      }

      function whenInvalid(value: string) {
        parent._input.setAttribute(config.isValidAttrName, 'false');
        parent._input.setAttribute(self.invalidValueAttribute, value);
        if (config.instantValidate)
          parent._input.classList.add(config.invalidClassName);
      }

      function durationOnValid(date: string) {
        setHours(date);
        if(parent.selectedDates.length !== 0)
          parent.timeContainer?.dispatchEvent(new Event('increment'));
      }
      
      function setHours(date: string) {
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
      }

      function checkIfValid(date: string) {
        let re = new RegExp(constructedRe);
        return re.test(date);
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

      function handleDefaultDate() {
        if (parent.config.defaultDate)
          parent.input.dispatchEvent(new Event('blur'));
      }

      function updateValue(newVal: string) {
        if (self.standinInput.value !== newVal)
          self.standinInput.value = newVal;
          //parent.formatDate(newVal)
      }

      function valueChanged(parsedDate: Date[], dateString: string) {
        if (parent.loadedPlugins.indexOf("duration") === -1) {
          //updateValue(dateString);
          self.standinInput.value = parent.formatDate(parsedDate[0], config.dateFormat);
          whenValid();
        } else {
          if(checkIfValid(dateString)){
            updateValue(dateString);
            whenValid();
          }
          if(false)
            console.log('dateStr', parsedDate);
          let arr = dateString.split(separator);
          if (arr.length < 1)
            return;
          let val = parent._input.getAttribute(self.invalidValueAttribute);
          if(val && 
            arr[0] === parent.config.defaultHour.toString() &&
            arr[1] === parent.config.defaultMinute.toString()) {
            parent.input.value = val;
          } else {
            updateValue(dateString);
            whenValid();
          }
        }
      }
      
      function onDestroy() {
        if(self.standinInput) {
          self.standinInput.removeEventListener("click", localOnClick);
          self.standinInput.classList.forEach((val) => {
            if(val !== 'flatpickr-input-validation-mock-input')
              parent.element.classList.add(val);
          });
        }
        if (config.attributesToCut && config.attributesToCut.length > 0) {
          config.attributesToCut.forEach((attr) => {
            let originalAttr= self.originalAtributes.getNamedItem(attr);
            if (originalAttr)
              parent.element.setAttribute(attr, originalAttr.value);
            })
        }
        if(self.observer)
          self.observer.disconnect();
      }

      return {
          onParseConfig() {
            parent.config.mode = "single";
            parent.config.allowInput = true;
            parent.config.clickOpens = false;
          },
          onValueUpdate: valueChanged,
          onReady: [
            adjustConfig,
            constructRegEx,
            createAdditionalInput,
            appendEventListeners,
            handleDefaultDate,
            setClassObserver,
            () => {
                parent.loadedPlugins.push("inputValidation");
            }
          ],
          onDestroy: onDestroy
        };
    };
}  

export default inputValidation;