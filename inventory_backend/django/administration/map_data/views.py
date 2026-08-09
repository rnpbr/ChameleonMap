from rest_framework.response import Response
from rest_framework.views import APIView

from .cache import get_map_data


class MapDataAPIView(APIView):
    http_method_names = ['get']

    def get(self, request):
        return Response(get_map_data())
