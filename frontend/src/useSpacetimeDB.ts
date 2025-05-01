import { Identity } from "./test-sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DbConnection, ErrorContext } from "./spacetimedb";

function getWindowDbConnection(): DbConnection|null {
    return (window as any).spacetimeDbConnection || null;
}

function setWindowDbConnection(conn: DbConnection|null) {
    (window as any).spacetimeDbConnection = conn;
}

function getWindowIdentity(): Identity | null {
    return (window as any).spacetimeIdentity || null;
}

function setWindowIdentity(identity: Identity|null) {
    (window as any).spacetimeIdentity = identity;
}

//This only works for a global connection with a single module.
//This should be generalized to handle any number of static 
export const useSpacetimeDB = (props: { url: string }) => {

    const [retryConnect,setRetryConnection] = useState(false);
    const [conn,setConn] = useState<DbConnection|null>(getWindowDbConnection());
    const [identity,setIdentity] = useState<Identity|null>(getWindowIdentity());
    const connectionInFlightRef = useRef({ inFlight: false });

    const onConnect = useCallback((conn: DbConnection,identity: Identity,token: string) => {
        connectionInFlightRef.current.inFlight = false;
        setIdentity(identity);
        localStorage.setItem("authToken",token);
        console.log("Connected to SpacetimeDB with identity ",identity.toHexString());
        setConn(conn);
        setWindowDbConnection(conn);
        setWindowIdentity(identity);
    },[]);

    const onDisconnect = useCallback(() => {
        connectionInFlightRef.current.inFlight = false;
        setRetryConnection(true);
        setConn(null);
        setWindowDbConnection(null);
        setWindowIdentity(null);
        console.log('Disconnected from SpacetimeDB');
    },[]);


    const onConnectError = useCallback((_ctx: ErrorContext, err: Error) => {
        connectionInFlightRef.current.inFlight = false;
        setRetryConnection(true);
        setConn(null);
        setWindowDbConnection(null);
        setWindowIdentity(null);
        console.error("Failed to connect to SpacetimeDB: ",err);

        //We do this since an old token can cause 401 issues.
        localStorage.removeItem("authToken");
    },[]);

    const connectHandler = useCallback(() => {
        if(getWindowDbConnection() && getWindowIdentity())
        {
            setConn(getWindowDbConnection());
            setIdentity(getWindowIdentity());
            return;
        }

        if(!getWindowDbConnection() && !connectionInFlightRef.current.inFlight)
        {
            connectionInFlightRef.current.inFlight = true;
            DbConnection.builder()
            .withUri(props.url)
            .withModuleName("place")
            .withToken(localStorage.getItem("authToken") || "")
            .onConnect(onConnect)
            .onDisconnect(onDisconnect)
            .onConnectError(onConnectError)
            .build();
        }

    },[props.url,onConnect,onDisconnect,onConnectError]);

    useEffect(() => {
        if(!retryConnect) {
            connectHandler();
        } 
        else 
        {
            const intervalHandler = setInterval(connectHandler,1000);
            return () => { clearInterval(intervalHandler); }
        }

    },[retryConnect,connectHandler]);

    return useMemo(() => {
        return { conn, identity};
        
    },[conn,identity])
}