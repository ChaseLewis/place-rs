import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DbConnection, ErrorContext } from "./spacetimedb";

function getWindowDbConnection(): DbConnection|null {
    return (window as any).spacetimeDbConnection || null;
}

function setWindowDbConnection(conn: DbConnection) {
    (window as any).spacetimeDbConnection = conn;
}

function getWindowIdentity(): Identity | null {
    return (window as any).spacetimeIdentity || null;
}

function setWindowIdentity(identity: Identity) {
    (window as any).spacetimeIdentity = identity;
}

//This only works for a global connection with a single module.
//This should be generalized to handle any number of static 
export const useSpacetimeDB = (props: { url: string }) => {

    const [conn,setConn] = useState<DbConnection|null>(getWindowDbConnection());
    const [identity,setIdentity] = useState<Identity|null>(getWindowIdentity());

    const onConnect = useCallback((conn: DbConnection,identity: Identity,token: string) => {
        setIdentity(identity);
        localStorage.setItem("authToken",token);
        console.log("Connected to SpacetimeDB with identity ",identity.toHexString());
        setConn(conn);
        setWindowDbConnection(conn);
        setWindowIdentity(identity);
    },[]);

    const onDisconnect = useCallback(() => {
        console.log('Disconnected from SpacetimeDB');
    },[]);


    const onConnectError = useCallback((_ctx: ErrorContext, err: Error) => {
        console.error("Failed to connect to SpacetimeDB: ",err);
    },[]);

    useEffect(() => {
        if(!conn)
        {
            DbConnection.builder()
            .withUri(props.url)
            .withModuleName("place")
            .withToken(localStorage.getItem("authToken") || "")
            .onConnect(onConnect)
            .onDisconnect(onDisconnect)
            .onConnectError(onConnectError)
            .build();
        }
    },[conn,props.url,onConnect,onDisconnect,onConnectError]);

    return useMemo(() => {
        return { conn, identity};
        
    },[conn,identity])
}