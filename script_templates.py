
artiq_templates = {
    "DDS": {
        "build": "self.setattr_device('urukul{board_id}_ch{channel_id}')",
        "initialize": [
            "self.urukul{board_id}_ch{channel_id}.init()",
            "self.urukul{board_id}_cpld.cfg_sw({channel_id}, True)",
            "self.urukul{board_id}_ch{channel_id}.set_att({attenuation})"
        ],
        "set_frequency": [
            "self.urukul{board_id}_ch{channel_id}.set({frequency}*{units}, amplitude = {amplitude})"
        ],
        "set_attenuation": [
            "self.urukul{board_id}_ch{channel_id}.set_att({attenuation})"
        ],
        "ramp_frequency": {
            "control": [
                "for i in range(0, {steps}}):"
            ],
            "block": [
                "self.urukul{board_id}_ch{channel_id}.set({frequency_per_step}*{i}*{freq_unit}, amplitude = {amplitude})",
                "delay({time_per_step} * {time_unit})"
            ]
        },
        "scan_frequency": {
            "control": [
                "for frequency in {frequencies}:"
            ],
            "block": [
                "self.urukul{board_id}_ch{channel_id}.set(frequency*{freq_unit}, amplitude = {amplitude})",
                "delay({time_per_step} * {time_unit})"
            ]
        },
        "turn_off": [
            "self.urukul{board_id}_cpld.cfg_sw({channel_id}, False)",
            "self.urukul{board_id}_ch{channel_id}.set({frequency}*${units}, amplitude = 0.0))"
        ],
        "RF_on": [
            "self.urukul{board_id}_cpld.cfg_sw({channel_id}, True)"
        ],
        "RF_off": [
            "self.urukul{board_id}_cpld.cfg_sw({channel_id}, False)"
        ],
    },
    "DAC": {
        "build": "self.setattr_device('zotino{board_id}')",
        "initialize": [
            "self.zotino{board_id}.init()"
        ],
        "set_voltage": [
            "self.zotino{board_id}.write_dac({channel_id}, {voltage})"
        ],
        "turn_off": [
            "self.zotino{board_id}.write_dac({channel_id}, 0.0)"
        ],
        "ramp": {
            "control": "for i in range(0, {steps}}):",
            "block": [
                "self.zotino{board_id}.write_dac({channel_id}, i*{volts_per_step})",
                "delay({time_per_step} * {time_unit})"
            ]
        }
    },
    "ADC": {
        "build": "self.setattr_device('sampler{board_id}')",
        "initialize": {
            "control": "for i in range({number_of_channels}):",
            "block": [
                "self.sampler0.set_gain_mu(i, {channel_gain})",
                "delay(100*us)"
            ],
            "main": [
                "sampler_data{channel_id} = [0.0]*{number_of_channels}"
            ]
        },
        "acquire_once": [
            "self.sampler{board_id}(sampler_data{board_id})"
        ],
        "acquire_continuous": {
            "main": [
                "{data_name} = []"
            ],
            "control": "for i in range(0, {steps})",
            "block": [
                "self.sampler{board_id}(sampler_data{board_id})",
                      "delay({time_per_step} * {time_unit})",
                      "{data_name}.append(sampler_data{board_id})"
            ]
        }
    },
    "TTL": {
        "build": "self.setattr_device('ttl{board_id}')",
        "single_pulse": [
            "self.ttl{board_id}.pulse({duration})",
            "delay({delay} * {time_unit})"
        ],
        "logic_high": [
            "self.ttl{board_id}.on"
        ],
        "logic_low": [
            "self.ttl{board_id}.on"
        ],
        "pulse_train": {
            "control": "for i in range(0, {number_of_pulses})",
            "block": [
                "self.ttl{board_id}.pulse({duration})",
                "delay({delay} * {time_unit})"
            ]
        }
    }
}

