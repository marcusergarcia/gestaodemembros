import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { endereco } = await request.json();

    if (!endereco) {
      return NextResponse.json(
        { error: "Endereço é obrigatório" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key do Google Maps não configurada" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        endereco
      )}&key=${apiKey}&language=pt-BR&region=br`
    );

    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return NextResponse.json({
        lat: location.lat,
        lng: location.lng,
        formatted_address: data.results[0].formatted_address,
      });
    }

    return NextResponse.json(
      { error: "Endereço não encontrado" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Erro no geocoding:", error);
    return NextResponse.json(
      { error: "Erro ao processar geocoding" },
      { status: 500 }
    );
  }
}
