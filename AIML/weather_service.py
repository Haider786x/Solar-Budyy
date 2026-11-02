# weather_service.py
# Fetch today's hourly weather + irradiance from Open-Meteo with compass azimuth conversion

import requests
import pandas as pd


def compass_to_openmeteo_azimuth(compass_deg: float) -> float:
    """
    Convert 360-degree compass azimuth (0=North, 90=East, 180=South, 270=West)
    to Open-Meteo solar azimuth (-180 to 180, where 0=South, -90=East, 90=West, 180/-180=North).
    """
    om_az = float(compass_deg) - 180.0
    while om_az > 180.0:
        om_az -= 360.0
    while om_az < -180.0:
        om_az += 360.0
    return round(om_az, 1)


def get_today_weather(lat: float, lon: float, tilt: float, azimuth: float):

    url = "https://api.open-meteo.com/v1/forecast"

    # Convert standard compass azimuth (e.g. 180=South) to Open-Meteo convention (0=South)
    om_azimuth = compass_to_openmeteo_azimuth(azimuth)

    params = {
        "latitude": lat,
        "longitude": lon,
        "tilt": tilt,
        "azimuth": om_azimuth,
        "hourly": [
            "temperature_2m",
            "relative_humidity_2m",
            "cloud_cover",
            "wind_speed_10m",
            "shortwave_radiation",
            "global_tilted_irradiance",
            "direct_normal_irradiance_instant",
            "sunshine_duration"
        ],
        "wind_speed_unit": "ms",
        "timezone": "auto",
        "forecast_days": 1
    }

    response = requests.get(url, params=params, timeout=15)
    data = response.json()

    if "hourly" not in data:
        raise ValueError(f"Open-Meteo API response error: {data.get('reason', 'Missing hourly field')}")

    hourly = data["hourly"]

    df = pd.DataFrame({
        "time": hourly["time"],
        "temperature": hourly["temperature_2m"],
        "humidity": hourly["relative_humidity_2m"],
        "cloud_cover": hourly["cloud_cover"],
        "wind_speed": hourly["wind_speed_10m"],
        "ghi": hourly["shortwave_radiation"],
        "gti": hourly["global_tilted_irradiance"],
        "dni_inst": hourly["direct_normal_irradiance_instant"],
        "sunshine_duration": hourly["sunshine_duration"]
    })

    return df
