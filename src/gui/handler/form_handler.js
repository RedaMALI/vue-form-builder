import {FORM_CONSTANTS} from "sethFormBuilder/config/constants";

const FormHandler = {};

function flattenControlInRows(rows) {
    var controls = [];
    _.each(rows, row => {
        _.each(row.controls, control => {
            controls.push(control);
        });
    });

    return controls;
}

FormHandler.dynamicTemplate = function(rows) {
    var controls = flattenControlInRows(rows);
    var controlData = {};

    _.each(controls, control => {
        controlData[control.fieldName] = !_.isEmpty(control.defaultValue) ? control.defaultValue : "";
    });

    return controlData;
};

function getControlValue(control, selectorOutside) {
    switch (control.type) {
        case 'number': {
            if(control.value===0) {
                return 0;
            }else if (control.value==='NaN') {
                return '';
            }
        }
        case 'timepicker':
            if(control.value==='Invalid date') {
                return '';
        }
        default:
            return control.value;
    }
}

FormHandler.getValue = function (form) {
    var formData = {};

    // solving for static
    _.each(form.sections, sectionInfo => {
        if (sectionInfo.isDynamic) {
            return;
        }

        var controlData = {};

        // flatten rows
        var controls = flattenControlInRows(sectionInfo.rows);

        // retrieve value in control
        _.each(controls, control => {
            // special get value
            controlData[control.fieldName] = getControlValue(control, `#${sectionInfo.name}_gui_body`);
        });

        // set data
        formData[sectionInfo.clientKey] = controlData;
    });

    // solving for dynamic
    _.each(form.sections, sectionInfo => {
        if (!sectionInfo.isDynamic) {
            return;
        }

        var sectionData = [];
        _.each(sectionInfo.instances, (instance, insIndex) => {
            var controlData = {};

            // flatten rows
            var controls = flattenControlInRows(instance);

            // retrieve value in control
            _.each(controls, control => {
                controlData[control.fieldName] = getControlValue(control, `#${sectionInfo.name}_gui_body .rowDynamic_${insIndex}`);
            });

            // populate data
            sectionData.push(controlData);
        });

        formData[sectionInfo.clientKey] = sectionData;
    });

    return formData;
};

function setControlValue(control, value, selectorOutside, firstInit = true) {
    if (firstInit) {
        control.value = value;
        return;
    }

    switch (control.type) {
        default:
            control.value = value;
    }
}

FormHandler.setValue = function(form, values) {
    // though the values - static form first
    _.each(values, (formData, key) => {
        var sectionInfo = _.find(form.sections, {clientKey: key});
        if (sectionInfo === undefined || sectionInfo.isDynamic) {
            return;
        }

        // flatten rows
        var controls = flattenControlInRows(sectionInfo.rows);
        _.each(controls, controlInfo => {
            if (formData[controlInfo.fieldName]) {
                setControlValue(controlInfo, formData[controlInfo.fieldName], `#${sectionInfo.name}_gui_body`, false);
            }
        });
    });

    // for the dynamic form
    _.each(values, (formData, key) => {
        var sectionInfo = _.find(form.sections, {clientKey: key});
        if (sectionInfo === undefined || !sectionInfo.isDynamic || !_.isArray(formData)) {
            return;
        }

        sectionInfo.instances = [];
        var insIndex = 0;
        _.each(formData, instanceData => {
            var template = _.cloneDeep(sectionInfo.rows);

            // push into a new instance
            sectionInfo.instances.push(template);

            // populate data into it
            var controls = flattenControlInRows(template);

            // push data to control
            _.each(controls, controlInfo => {
                if (instanceData[controlInfo.fieldName]) {
                    setControlValue(controlInfo, instanceData[controlInfo.fieldName], `#${sectionInfo.name}_gui_body .rowDynamic_${insIndex++}`);
                }
            });
        });
    });
};

FormHandler.clearErrorField = function() {
    $("input.control-error").removeClass('control-error');
    $(".select2-container .selection .select2-selection.control-error").removeClass('control-error');
};

FormHandler.validate = function (form) {
    FormHandler.clearErrorField();

    _.each(form.sections, sectionInfo => {
        if (!sectionInfo.isDynamic) {
            validate_static_form(sectionInfo);
        } else {
            validate_dynamic_form(sectionInfo);
        }
    });

    console.log('FormHandler.validate: ', ($("input.control-error").length > 0 || $(".select2-container .selection .select2-selection.control-error").length > 0));

    return ($("input.control-error").length > 0 || $(".select2-container .selection .select2-selection.control-error").length > 0);
};

var validate_static_form = function (sectionInfo) {
    // flatten rows
    console.log('---------------------validate_static_form--------------------------');
    console.log('sectionInfo.name: ', sectionInfo.name);
    var controls = flattenControlInRows(sectionInfo.rows);
    _.each(controls, controlInfo => {
        console.log('controlInfo.required: ', controlInfo.required);
        if (!controlInfo.required) {
            return;
        }

        const value = getControlValue(controlInfo, `#${sectionInfo.name}_gui_body`);
        console.log('controlInfo_Value: ', value, _.isEmpty(value))
        let checkValue = _.isEmpty(value);
        // In case the control returns a boolean value then we should check directly on the returned value
        if(typeof value === 'boolean') checkValue = !value;
        if (checkValue) {
            // special case for number 0
            if (controlInfo.type === 'number' && _.isNumber(value) && !_.isNaN(value)) {
                return;
            }

            // set error here
            if(controlInfo.type === 'select') {
                $(`#${sectionInfo.name}_gui_body #${controlInfo.fieldName} .select2-container .selection .select2-selection`).addClass('control-error');
            }else {
                $(`#${sectionInfo.name}_gui_body input[name='${controlInfo.fieldName}']`).addClass('control-error');
            }
        }
    });
    console.log('---------------------validate_static_form--------------------------');
};

var validate_dynamic_form = function (sectionInfo) {
    console.log('---------------------validate_dynamic_form--------------------------');
    _.each(sectionInfo.instances, (instance, insIndex) => {
        console.log('sectionInfo.name: ', sectionInfo.name);

        // flatten rows
        var controls = flattenControlInRows(instance);

        // retrieve value in control
        _.each(controls, controlInfo => {
            if (!controlInfo.required) {
                return;
            }

            let value = getControlValue(controlInfo, `#${sectionInfo.name}_gui_body .rowDynamic_${insIndex}`);
            console.log('controlInfo_Value: ', value, _.isEmpty(value))
            let checkValue = _.isEmpty(value);
            // In case the control returns a boolean value then we should check directly on the returned value
            if(typeof value === 'boolean') checkValue = !value;
            if (checkValue) {
                // special case for number 0
                if (controlInfo.type === 'number' && _.isNumber(value) && !_.isNaN(value)) {
                    return;
                }

                // set error here
                if(controlInfo.type === 'select') {
                    $(`#${sectionInfo.name}_gui_body .rowDynamic_${insIndex} #${controlInfo.fieldName} .select2-container .selection .select2-selection`).addClass('control-error');
                }else {
                    $(`#${sectionInfo.name}_gui_body .rowDynamic_${insIndex} input[name='${controlInfo.fieldName}']`).addClass('control-error');
                }
            }
        });
    });
    console.log('---------------------validate_dynamic_form--------------------------');
};

// re-structure (extend) to make sure the data is correct
FormHandler.recorrectStructure = function (form) {
    // section first
    _.each(form.sections, (sectionInfo, secIndex) => {
        // section re-build
        let rows = _.cloneDeep(sectionInfo.rows);
        form.sections[secIndex] = _.extend(_.cloneDeep(FORM_CONSTANTS.Section), sectionInfo);
        form.sections[secIndex].rows = rows;
    });

    // row
    _.each(form.sections, (sectionInfo) => {
        _.each(sectionInfo.rows, (rowInfo, rowIndex) => {
            let controls = _.cloneDeep(rowInfo.controls);
            sectionInfo.rows[rowIndex] = _.extend(_.cloneDeep(FORM_CONSTANTS.Row), rowInfo);
            sectionInfo.rows[rowIndex].controls = controls;
        });
    });

    // control
    _.each(form.sections, (sectionInfo) => {
        _.each(sectionInfo.rows, (rowInfo) => {
            _.each(rowInfo.controls, (controlInfo, index) => {
                // prepare data deep
                let staticSource = _.cloneDeep(controlInfo.dataOptions);

                // extend
                rowInfo.controls[index] = _.extend(_.cloneDeep(FORM_CONSTANTS.Control), controlInfo);

                // special information need to clone
                rowInfo.controls[index].dataOptions = staticSource;
            });
        });
    });

    return form;
};

export {
    FormHandler
}
