from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .serializers import TenantRegistrationSerializer

class TenantPublicRegistrationView(generics.CreateAPIView):
    """
    Endpoint público para que nuevas empresas se registren en la plataforma.
    """
    serializer_class = TenantRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                "message": "Empresa registrada exitosamente. Estamos preparando su entorno.",
                "tenant": serializer.data
            }, 
            status=status.HTTP_201_CREATED, 
            headers=headers
        )
