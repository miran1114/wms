"""Custom exception handling for DRF."""
from __future__ import annotations

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Custom exception handler that returns consistent error format."""
    response = exception_handler(exc, context)

    if response is not None:
        # Customize the response data
        custom_response_data = {
            'code': 1,
            'message': '',
            'errors': None
        }

        if isinstance(response.data, dict):
            if 'detail' in response.data:
                custom_response_data['message'] = str(response.data['detail'])
            else:
                # Collect all error messages
                errors = []
                for field, value in response.data.items():
                    if isinstance(value, list):
                        errors.extend([f"{field}: {v}" for v in value])
                    else:
                        errors.append(f"{field}: {value}")
                custom_response_data['message'] = '; '.join(errors) if errors else '请求错误'
                custom_response_data['errors'] = response.data
        elif isinstance(response.data, list):
            custom_response_data['message'] = '; '.join(str(item) for item in response.data)
        else:
            custom_response_data['message'] = str(response.data)

        response.data = custom_response_data

    return response
